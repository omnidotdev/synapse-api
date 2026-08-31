ALTER TABLE "usage_event" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_event_dedupe_key_index" ON "usage_event" USING btree ("dedupe_key");