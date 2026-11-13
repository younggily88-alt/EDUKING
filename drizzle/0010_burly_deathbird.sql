ALTER TABLE "issue_notes" ADD COLUMN "notion_page_id" text;--> statement-breakpoint
ALTER TABLE "issue_notes" ADD COLUMN "notion_url" text;--> statement-breakpoint
ALTER TABLE "issue_notes" ADD COLUMN "notion_saved_at" timestamp with time zone;