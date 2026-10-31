import { Env } from "./config/env";
import { Transcoder } from "./transcoder";

async function main(): Promise<void> {
  Env.validate();
  console.log("transocder started");

  const sourceKey = Env.SOURCE_KEY;
  if (!sourceKey) {
    throw new Error("SOURCE_KEY is not set");
  }

  await Transcoder.run(sourceKey);
  console.log("transcoding finished");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("transcoding failed:", err);
    process.exit(1);
  },
);
