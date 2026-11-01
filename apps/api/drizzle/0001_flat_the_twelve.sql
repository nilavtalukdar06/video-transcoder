CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rendition_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('uploaded', 'queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "transcoding_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"ecs_task_arn" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transcoding_jobs_video_id_attempt_unique" UNIQUE("video_id","attempt")
);
--> statement-breakpoint
CREATE TABLE "video_renditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"job_id" uuid,
	"name" text NOT NULL,
	"height" integer NOT NULL,
	"status" "rendition_status" DEFAULT 'pending' NOT NULL,
	"output_bucket" text,
	"output_key" text,
	"size_bytes" bigint,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "video_renditions_video_id_name_unique" UNIQUE("video_id","name")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_bucket" text NOT NULL,
	"source_key" text NOT NULL,
	"size_bytes" bigint,
	"status" "video_status" DEFAULT 'uploaded' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "videos_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "transcoding_jobs" ADD CONSTRAINT "transcoding_jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_renditions" ADD CONSTRAINT "video_renditions_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_renditions" ADD CONSTRAINT "video_renditions_job_id_transcoding_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."transcoding_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcoding_jobs_video_id_idx" ON "transcoding_jobs" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "transcoding_jobs_status_idx" ON "transcoding_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_renditions_job_id_idx" ON "video_renditions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "videos_user_id_idx" ON "videos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "videos_status_idx" ON "videos" USING btree ("status");