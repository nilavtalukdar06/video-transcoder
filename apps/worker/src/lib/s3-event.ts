export interface S3ObjectRef {
  bucket: string;
  key: string;
  size?: number;
}

interface S3NotificationRecord {
  eventName?: string;
  s3?: {
    bucket?: { name?: string };
    object?: { key?: string; size?: number };
  };
}

interface S3EventBody {
  Records?: S3NotificationRecord[];
  source?: string;
  "detail-type"?: string;
  detail?: {
    bucket?: { name?: string };
    object?: { key?: string; size?: number };
  };
}

export abstract class S3Event {
  static parseCreatedObjects(body: string): S3ObjectRef[] {
    const parsed = JSON.parse(body) as S3EventBody;

    if (parsed.source === "aws.s3") {
      return this.fromEventBridge(parsed);
    }
    return this.fromNotification(parsed);
  }

  private static fromEventBridge(event: S3EventBody): S3ObjectRef[] {
    if (event["detail-type"] !== "Object Created") return [];

    const bucket = event.detail?.bucket?.name;
    const key = event.detail?.object?.key;
    if (!bucket || !key) return [];

    return [
      { bucket, key: this.decodeKey(key), size: event.detail?.object?.size },
    ];
  }

  private static fromNotification(event: S3EventBody): S3ObjectRef[] {
    const refs: S3ObjectRef[] = [];

    for (const record of event.Records ?? []) {
      const bucket = record.s3?.bucket?.name;
      const key = record.s3?.object?.key;
      if (!bucket || !key) continue;
      if (!record.eventName?.startsWith("ObjectCreated")) continue;

      refs.push({
        bucket,
        key: this.decodeKey(key),
        size: record.s3?.object?.size,
      });
    }

    return refs;
  }

  private static decodeKey(key: string): string {
    return decodeURIComponent(key.replace(/\+/g, " "));
  }
}
