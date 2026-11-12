ALTER TABLE "articles" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "auto_type" varchar(20);--> statement-breakpoint
ALTER TABLE "issue_notes" ADD COLUMN "ai_feedback" jsonb;--> statement-breakpoint
ALTER TABLE "issue_notes" ADD COLUMN "feedback_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_url_unique" UNIQUE("url");