CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"key_hash" text NOT NULL,
	"key_hint" text NOT NULL,
	"name" text NOT NULL,
	"mode" text DEFAULT 'byok' NOT NULL,
	"last_used_at" timestamp(6) with time zone,
	"expires_at" timestamp(6) with time zone,
	"revoked_at" timestamp(6) with time zone,
	"created_at" timestamp(6) with time zone DEFAULT now(),
	"updated_at" timestamp(6) with time zone DEFAULT now(),
	CONSTRAINT "api_key_keyHash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "provider_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_hint" text NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now(),
	"updated_at" timestamp(6) with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"api_key_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"mode" text NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "post" CASCADE;--> statement-breakpoint
DROP TABLE "workspace" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_key" ADD CONSTRAINT "provider_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_id_index" ON "api_key" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_key_hash_index" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_key_user_id_index" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_key_id_index" ON "provider_key" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_key_user_id_provider_index" ON "provider_key" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_event_id_index" ON "usage_event" USING btree ("id");--> statement-breakpoint
CREATE INDEX "usage_event_user_id_index" ON "usage_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_event_api_key_id_index" ON "usage_event" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "usage_event_created_at_index" ON "usage_event" USING btree ("created_at");