import { Kafka, logLevel, type Consumer, type KafkaConfig } from "kafkajs";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Env } from "../config/env";
import { ClickHouse, type LogEventRow } from "./clickhouse";
import { LogMessageParser } from "./log-message";
import { Logger } from "./logger";

const CA_PATH = path.resolve(process.cwd(), "ca.pem");

export abstract class LogsConsumer {
  private static consumer: Consumer | null = null;
  private static running = false;

  private static buildConfig(): KafkaConfig {
    const config: KafkaConfig = {
      clientId: "video-transcoding-logs-consumer",
      brokers: [Env.KAFKA_BROKER],
      logLevel: logLevel.WARN,
    };

    if (Env.KAFKA_SSL) {
      config.ssl = { ca: [fs.readFileSync(CA_PATH, "utf-8")] };
    }

    if (Env.KAFKA_SASL) {
      config.sasl = {
        username: Env.KAFKA_USERNAME ?? "",
        password: Env.KAFKA_PASSWORD ?? "",
        mechanism: "plain",
      };
    }

    return config;
  }

  static get isRunning(): boolean {
    return this.running;
  }

  static async start(): Promise<void> {
    if (this.consumer) return;

    const consumer = new Kafka(this.buildConfig()).consumer({
      groupId: Env.KAFKA_GROUP_ID,
    });
    this.consumer = consumer;

    await consumer.connect();
    await consumer.subscribe({
      topic: Env.KAFKA_LOGS_TOPIC,
      fromBeginning: false,
    });

    await consumer.run({
      eachBatchAutoResolve: false,
      eachBatch: async ({
        batch,
        resolveOffset,
        heartbeat,
        commitOffsetsIfNecessary,
      }) => {
        const rows: LogEventRow[] = [];

        for (const message of batch.messages) {
          const raw = message.value?.toString();
          if (!raw) continue;

          try {
            const { videoId, jobId, log, timestamp } =
              LogMessageParser.parse(raw);
            console.log(
              `[video=${videoId ?? "-"} job=${jobId ?? "-"}] ${timestamp} ${log}`,
            );
            rows.push({
              event_id: randomUUID(),
              video_id: videoId ?? "",
              job_id: jobId ?? "",
              log,
              metadata: JSON.stringify({
                producedAt: timestamp,
                topic: batch.topic,
                partition: batch.partition,
                offset: message.offset,
              }),
            });
          } catch (err) {
            Logger.warn(
              {
                err,
                topic: batch.topic,
                partition: batch.partition,
                offset: message.offset,
              },
              "Discarding Kafka message with an unparseable body",
            );
          }
        }

        // Offsets are only resolved and committed once the insert succeeded; if
        // it throws, kafkajs retries the batch from the last resolved offset.
        await ClickHouse.insertLogEvents(rows);
        for (const message of batch.messages) {
          resolveOffset(message.offset);
        }
        await commitOffsetsIfNecessary();
        await heartbeat();
      },
    });

    this.running = true;
    Logger.info(
      { topic: Env.KAFKA_LOGS_TOPIC, groupId: Env.KAFKA_GROUP_ID },
      "Kafka logs consumer started",
    );
  }

  static async stop(): Promise<void> {
    if (!this.consumer) return;
    const consumer = this.consumer;
    this.consumer = null;
    this.running = false;
    await consumer.disconnect();
    Logger.info("Kafka logs consumer stopped");
  }
}
