import { Kafka, type KafkaConfig } from "kafkajs";
import fs from "node:fs";
import path from "node:path";
import { Env } from "../config/env";
const CA_PATH = path.resolve(process.cwd(), "ca.pem");
const kafkaConfig: KafkaConfig = {
  clientId: "video-transcoder",
  brokers: [Env.KAFKA_BROKER],
};
if (Env.KAFKA_SSL) {
  kafkaConfig.ssl = {
    ca: [fs.readFileSync(CA_PATH, "utf-8")],
  };
}
if (Env.KAFKA_SASL) {
  kafkaConfig.sasl = {
    username: Env.KAFKA_USERNAME ?? "",
    password: Env.KAFKA_PASSWORD ?? "",
    mechanism: "plain",
  };
}
export const kafka = new Kafka(kafkaConfig);
export const producer = kafka.producer();
