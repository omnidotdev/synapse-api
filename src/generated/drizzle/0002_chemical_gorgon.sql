ALTER TABLE "api_key" ADD COLUMN "app_id" text;--> statement-breakpoint
ALTER TABLE "api_key" ADD COLUMN "billing_entity_type" text;--> statement-breakpoint
ALTER TABLE "api_key" ADD COLUMN "billing_entity_id" text;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_app_id_slug" CHECK ("api_key"."app_id" IS NULL OR "api_key"."app_id" ~ '^[a-z][a-z0-9-]{0,62}$');--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_billing_entity_scoped" CHECK (("api_key"."app_id" IS NULL AND "api_key"."billing_entity_type" IS NULL AND "api_key"."billing_entity_id" IS NULL) OR ("api_key"."app_id" IS NOT NULL AND "api_key"."billing_entity_type" IN ('user', 'organization') AND "api_key"."billing_entity_id" IS NOT NULL));