import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const videoStatus = pgEnum("video_status", [
  "uploaded",
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const jobStatus = pgEnum("job_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const renditionStatus = pgEnum("rendition_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceBucket: text("source_bucket").notNull(),
    sourceKey: text("source_key").notNull().unique(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    status: videoStatus("status").notNull().default("uploaded"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("videos_user_id_idx").on(t.userId),
    index("videos_status_idx").on(t.status),
  ],
);

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export const transcodingJobs = pgTable(
  "transcoding_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    status: jobStatus("status").notNull().default("pending"),
    attempt: integer("attempt").notNull().default(1),
    ecsTaskArn: text("ecs_task_arn"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("transcoding_jobs_video_id_idx").on(t.videoId),
    index("transcoding_jobs_status_idx").on(t.status),
    unique("transcoding_jobs_video_id_attempt_unique").on(t.videoId, t.attempt),
  ],
);

export type TranscodingJob = typeof transcodingJobs.$inferSelect;
export type NewTranscodingJob = typeof transcodingJobs.$inferInsert;

export const videoRenditions = pgTable(
  "video_renditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => transcodingJobs.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    height: integer("height").notNull(),
    status: renditionStatus("status").notNull().default("pending"),
    outputBucket: text("output_bucket"),
    outputKey: text("output_key"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    unique("video_renditions_video_id_name_unique").on(t.videoId, t.name),
    index("video_renditions_job_id_idx").on(t.jobId),
  ],
);

export type VideoRendition = typeof videoRenditions.$inferSelect;
export type NewVideoRendition = typeof videoRenditions.$inferInsert;
