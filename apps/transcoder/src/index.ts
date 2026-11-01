import { Env } from "./config/env";
import { Database } from "./db";
import { Logs } from "./lib/logs";
import { Transcoder } from "./transcoder";
async function main(): Promise<void> {
  Env.validate();
  console.log("transocder started");
  const sourceKey = Env.SOURCE_KEY;
  if (!sourceKey) {
    throw new Error("SOURCE_KEY is not set");
  }
  const videoId = Env.VIDEO_ID;
  const jobId = Env.JOB_ID;
  if (!videoId || !jobId) {
    throw new Error("VIDEO_ID and JOB_ID must be set");
  }
  await Database.connect();
  await Logs.connect();
  try {
    await Transcoder.run(sourceKey, { videoId, jobId });
  } finally {
    await Logs.close();
    await Database.close();
  }
  console.log("transcoding finished");
}
main().then(
  () => process.exit(0),
  (err) => {
    console.error("transcoding failed:", err);
    process.exit(1);
  },
);
