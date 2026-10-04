CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
INSERT INTO "roles" ("id", "name", "description", "permissions", "is_system") VALUES
	('admin', 'Administrador', 'Gestiona miembros y eventos de su organización', ARRAY['members:manage', 'events:manage', 'tickets:redeem']::text[], true),
	('organizer', 'Organizador', 'Gestiona eventos y valida entradas', ARRAY['events:manage', 'tickets:redeem']::text[], true);
--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "role_id" text;--> statement-breakpoint
UPDATE "organization_members" SET "role_id" = "role"::text;--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_members_role_idx" ON "organization_members" USING btree ("role_id");--> statement-breakpoint
ALTER TABLE "organization_members" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."org_role";
