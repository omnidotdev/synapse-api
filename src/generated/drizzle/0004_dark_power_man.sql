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
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_preference_id_index" ON "user_preference" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preference_user_id_index" ON "user_preference" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_id_index" ON "workspace" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_org_slug_unique" ON "workspace" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "workspace_organization_id_index" ON "workspace" USING btree ("organization_id");