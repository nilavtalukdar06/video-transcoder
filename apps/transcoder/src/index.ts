import { Env } from "./config/env";
import { Database } from "./db";
import { Transcoder } from "./transcoder";

async function main(): Promise<void> {
  Env.validate();
  console.log("transocder started");

  const sourceKey = Env.SOURCE_KEY;
  if (!sourceKey) {
    throw new Error("SOURCE_KEY is not set");
  }

  await Database.connect();
  try {
    await Transcoder.run(sourceKey);
  } finally {
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
