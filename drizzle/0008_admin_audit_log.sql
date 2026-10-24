CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" text NOT NULL,
	"impersonated_user_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"organization_id" text,
	"input" jsonb,
	"result" text NOT NULL,
	"error_code" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_idx" ON "admin_audit_log" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_action_idx" ON "admin_audit_log" USING btree ("action");
--> statement-breakpoint
CREATE FUNCTION "admin_audit_log_append_only"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "admin_audit_log_no_update_delete" BEFORE UPDATE OR DELETE ON "admin_audit_log" FOR EACH ROW EXECUTE FUNCTION "admin_audit_log_append_only"();--> statement-breakpoint
CREATE TRIGGER "admin_audit_log_no_truncate" BEFORE TRUNCATE ON "admin_audit_log" FOR EACH STATEMENT EXECUTE FUNCTION "admin_audit_log_append_only"();
