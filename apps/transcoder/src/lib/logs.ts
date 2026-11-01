import { Env } from "../config/env";
import { producer } from "./kafka";

let connected = false;

export abstract class Logs {
  static async connect(): Promise<void> {
    if (connected) return;
    try {
      await producer.connect();
      connected = true;
      console.log("Kafka producer connected");
    } catch (err) {
      console.error("Could not connect Kafka producer:", err);
    }
  }

  static async close(): Promise<void> {
    if (!connected) return;
    connected = false;
    try {
      await producer.disconnect();
      console.log("Kafka producer disconnected");
    } catch (err) {
      console.error("Could not disconnect Kafka producer:", err);
    }
  }
}

export async function processLogs(logs: string): Promise<void> {
  console.log(logs);

  if (!connected) return;

  try {
    await producer.send({
      topic: Env.KAFKA_LOGS_TOPIC,
      messages: [
        {
          key: Env.VIDEO_ID ?? null,
          value: JSON.stringify({
            videoId: Env.VIDEO_ID ?? null,
            jobId: Env.JOB_ID ?? null,
            log: logs,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  } catch (err) {
    console.error("Could not produce logs to Kafka:", err);
  }
}
