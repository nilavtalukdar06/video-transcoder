import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { Env } from "../config/env";
import { Logger } from "./logger";
export interface TranscoderTaskInput {
  sourceKey: string;
  videoId: string;
  jobId: string;
}
export abstract class TranscoderTask {
  private static client: ECSClient | null = null;
  private static getClient(): ECSClient {
    if (!this.client) {
      this.client = new ECSClient({
        region: Env.AWS_REGION,
        credentials: {
          accessKeyId: Env.AWS_ACCESS_KEY,
          secretAccessKey: Env.AWS_SECRET_KEY,
        },
      });
    }
    return this.client;
  }
  static async run({
    sourceKey,
    videoId,
    jobId,
  }: TranscoderTaskInput): Promise<string> {
    const { tasks, failures } = await this.getClient().send(
      new RunTaskCommand({
        cluster: Env.ECS_CLUSTER,
        taskDefinition: Env.ECS_TASK_DEFINITION,
        launchType: "FARGATE",
        count: 1,
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: Env.ECS_SUBNETS,
            securityGroups: Env.ECS_SECURITY_GROUPS,
            assignPublicIp: Env.ECS_ASSIGN_PUBLIC_IP,
          },
        },
        overrides: {
          containerOverrides: [
            {
              name: Env.ECS_CONTAINER_NAME,
              environment: [
                { name: "SOURCE_KEY", value: sourceKey },
                { name: "VIDEO_ID", value: videoId },
                { name: "JOB_ID", value: jobId },
              ],
            },
          ],
        },
      }),
    );
    const taskArn = tasks?.[0]?.taskArn;
    if (!taskArn) {
      const reason = failures?.map((f) => `${f.arn}: ${f.reason}`).join("; ");
      throw new Error(`ECS RunTask returned no task: ${reason ?? "unknown"}`);
    }
    Logger.info(
      { taskArn, sourceKey, videoId, jobId },
      "Started transcoder task",
    );
    return taskArn;
  }
  static destroy(): void {
    this.client?.destroy();
    this.client = null;
  }
}
