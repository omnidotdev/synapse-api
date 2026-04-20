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
CREATE TABLE "api_key_provider" (
	"api_key_id" uuid NOT NULL,
	"provider_key_id" uuid NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now(),
	CONSTRAINT "api_key_provider_api_key_id_provider_key_id_pk" PRIMARY KEY("api_key_id","provider_key_id")
);
--> statement-breakpoint
CREATE TABLE "provider_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_hint" text NOT NULL,
	"model_preference" text,
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
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_provider_id" uuid NOT NULL,
	"email" text,
	"name" text,
	"avatar_url" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now(),
	"updated_at" timestamp(6) with time zone DEFAULT now(),
	CONSTRAINT "user_identityProviderId_unique" UNIQUE("identity_provider_id")
);
--> statement-breakpoint
CREATE TABLE "user_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"default_provider" text,
	"notify_usage_threshold" boolean DEFAULT true NOT NULL,
	"notify_key_expiry" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now(),
	CONSTRAINT "user_preference_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp(6) with time zone DEFAULT now(),
	"updated_at" timestamp(6) with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_provider" ADD CONSTRAINT "api_key_provider_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_provider" ADD CONSTRAINT "api_key_provider_provider_key_id_provider_key_id_fk" FOREIGN KEY ("provider_key_id") REFERENCES "public"."provider_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_key" ADD CONSTRAINT "provider_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_id_index" ON "api_key" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_key_hash_index" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_key_user_id_index" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_key_id_index" ON "provider_key" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_key_user_id_provider_index" ON "provider_key" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_event_id_index" ON "usage_event" USING btree ("id");--> statement-breakpoint
CREATE INDEX "usage_event_user_id_index" ON "usage_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_event_api_key_id_index" ON "usage_event" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "usage_event_created_at_index" ON "usage_event" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_id_index" ON "user" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identity_provider_id_index" ON "user" USING btree ("identity_provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preference_id_index" ON "user_preference" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preference_user_id_index" ON "user_preference" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_id_index" ON "workspace" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_org_slug_unique" ON "workspace" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "workspace_organization_id_index" ON "workspace" USING btree ("organization_id");