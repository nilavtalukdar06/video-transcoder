import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from "@aws-sdk/client-sqs";
import { Env } from "../config/env";
import { Logger } from "./logger";
import { S3Event, type S3ObjectRef } from "./s3-event";
import { TranscoderTask } from "./transcoder-task";

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
    TranscoderTask.destroy();
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
          try {
            await this.handle(message);
          } catch (err) {
            Logger.error(
              { err, messageId: message.MessageId },
              "Failed to process SQS message, leaving it on the queue to retry",
            );
          }
        }
      } catch (err) {
        if (!this.running) break;
        Logger.error({ err }, "Failed to poll SQS queue");
        await new Promise((resolve) => setTimeout(resolve, ERROR_BACKOFF_MS));
      }
    }
  }

  private static async handle(message: Message): Promise<void> {
    const objects = this.parseObjects(message);

    Logger.info(
      { messageId: message.MessageId, objects },
      "Received SQS event",
    );

    for (const { bucket, key } of objects) {
      if (bucket !== Env.AWS_S3_BUCKET) {
        Logger.warn({ bucket, key }, "Ignoring object from unexpected bucket");
        continue;
      }
      await TranscoderTask.run(key);
    }

    await this.getClient().send(
      new DeleteMessageCommand({
        QueueUrl: Env.SQS_URL,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }

  private static parseObjects(message: Message): S3ObjectRef[] {
    try {
      return S3Event.parseCreatedObjects(message.Body ?? "");
    } catch (err) {
      Logger.warn(
        { err, messageId: message.MessageId },
        "Discarding SQS message with an unparseable body",
      );
      return [];
    }
  }
}
