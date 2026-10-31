import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from "@aws-sdk/client-sqs";
import { Env } from "../config/env";
import { Logger } from "./logger";

const WAIT_TIME_SECONDS = 20;
const MAX_MESSAGES = 10;
const ERROR_BACKOFF_MS = 5_000;

export abstract class QueueConsumer {
  private static client: SQSClient | null = null;
  private static running = false;
  private static abortController: AbortController | null = null;
  private static loop: Promise<void> | null = null;

  private static getClient(): SQSClient {
    if (!this.client) {
      this.client = new SQSClient({
        region: Env.AWS_REGION,
        credentials: {
          accessKeyId: Env.AWS_ACCESS_KEY,
          secretAccessKey: Env.AWS_SECRET_KEY,
        },
      });
    }
    return this.client;
  }

  static start(): void {
    if (this.running) return;
    this.running = true;
    this.abortController = new AbortController();
    this.loop = this.poll();
    Logger.info({ queueUrl: Env.SQS_URL }, "SQS consumer started");
  }

  static async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.abortController?.abort();
    await this.loop;
    this.client?.destroy();
    this.client = null;
    Logger.info("SQS consumer stopped");
  }

  private static async poll(): Promise<void> {
    const signal = this.abortController!.signal;

    while (this.running) {
      try {
        const { Messages } = await this.getClient().send(
          new ReceiveMessageCommand({
            QueueUrl: Env.SQS_URL,
            MaxNumberOfMessages: MAX_MESSAGES,
            WaitTimeSeconds: WAIT_TIME_SECONDS,
          }),
          { abortSignal: signal },
        );

        for (const message of Messages ?? []) {
          await this.handle(message);
        }
      } catch (err) {
        if (!this.running) break;
        Logger.error({ err }, "Failed to poll SQS queue");
        await new Promise((resolve) => setTimeout(resolve, ERROR_BACKOFF_MS));
      }
    }
  }

  private static async handle(message: Message): Promise<void> {
    console.log("Received SQS message:", message.Body);

    await this.getClient().send(
      new DeleteMessageCommand({
        QueueUrl: Env.SQS_URL,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }
}
