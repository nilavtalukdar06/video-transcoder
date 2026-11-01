import { Kafka, logLevel, type Consumer, type KafkaConfig } from "kafkajs";
import fs from "node:fs";
import path from "node:path";
import { Env } from "../config/env";
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
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        try {
          const { videoId, jobId, log, timestamp } =
            LogMessageParser.parse(raw);
          console.log(
            `[video=${videoId ?? "-"} job=${jobId ?? "-"}] ${timestamp} ${log}`,
          );
        } catch (err) {
          Logger.warn(
            { err, topic, partition, offset: message.offset },
            "Discarding Kafka message with an unparseable body",
          );
        }
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
