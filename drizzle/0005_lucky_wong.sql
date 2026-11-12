CREATE TABLE "assignment_files" (
	"assignment_id" integer PRIMARY KEY NOT NULL,
	"data_base64" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_files" ADD CONSTRAINT "assignment_files_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;