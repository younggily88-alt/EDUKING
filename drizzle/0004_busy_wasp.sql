CREATE TABLE "rubrics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rubrics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"criteria" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "rubric_id" integer;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "max_score" integer;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "grade_result" jsonb;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "graded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE set null ON UPDATE no action;