export interface S3ObjectRef {
  bucket: string;
  key: string;
}

interface S3EventRecord {
  eventName?: string;
  s3?: {
    bucket?: { name?: string };
    object?: { key?: string };
  };
}

export abstract class S3Event {
  static parseCreatedObjects(body: string): S3ObjectRef[] {
    const parsed = JSON.parse(body) as { Records?: S3EventRecord[] };
    const refs: S3ObjectRef[] = [];

    for (const record of parsed.Records ?? []) {
      const bucket = record.s3?.bucket?.name;
      const key = record.s3?.object?.key;
      if (!bucket || !key) continue;
      if (!record.eventName?.startsWith("ObjectCreated")) continue;

      refs.push({
        bucket,
        key: decodeURIComponent(key.replace(/\+/g, " ")),
      });
    }

    return refs;
  }
}
