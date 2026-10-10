CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"gross_amount" integer NOT NULL,
	"fee_amount" integer NOT NULL,
	"payout_amount" integer NOT NULL,
	"currency" text DEFAULT 'PEN' NOT NULL,
	"status" "settlement_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"stripe_transfer_id" text,
	"failure_code" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_eventId_unique" UNIQUE("event_id"),
	CONSTRAINT "settlements_stripeTransferId_unique" UNIQUE("stripe_transfer_id"),
	CONSTRAINT "settlements_amounts_check" CHECK ("settlements"."gross_amount" >= 0 and "settlements"."fee_amount" >= 0 and "settlements"."payout_amount" = "settlements"."gross_amount" - "settlements"."fee_amount" and "settlements"."payout_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "settlement_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settlements_org_idx" ON "settlements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "settlements_status_idx" ON "settlements" USING btree ("status");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_settlement_idx" ON "orders" USING btree ("settlement_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_stripeRefundId_unique" UNIQUE("stripe_refund_id");