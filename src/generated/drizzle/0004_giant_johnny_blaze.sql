ALTER TABLE "api_key" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
CREATE INDEX "api_key_organization_id_index" ON "api_key" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_organization_direct_only" CHECK ("api_key"."organization_id" IS NULL OR "api_key"."app_id" IS NULL);