ALTER TABLE "usage_event" ALTER COLUMN "cost_cents" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "modality" text DEFAULT 'completion' NOT NULL;