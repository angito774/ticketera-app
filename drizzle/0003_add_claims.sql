CREATE TYPE "public"."claim_item_type" AS ENUM('product', 'service');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('received', 'in_progress', 'answered');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('claim', 'complaint');--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "claims_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" "claim_type" NOT NULL,
	"status" "claim_status" DEFAULT 'received' NOT NULL,
	"full_name" text NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"is_minor" boolean DEFAULT false NOT NULL,
	"guardian_full_name" text,
	"guardian_document_type" text,
	"guardian_document_number" text,
	"item_type" "claim_item_type" NOT NULL,
	"item_description" text NOT NULL,
	"claimed_amount_cents" integer,
	"order_reference" text,
	"detail" text NOT NULL,
	"consumer_request" text NOT NULL,
	"due_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response" text,
	"answered_at" timestamp with time zone,
	CONSTRAINT "claims_number_unique" UNIQUE("number"),
	CONSTRAINT "claims_email_lower_ck" CHECK ("claims"."email" = lower("claims"."email")),
	CONSTRAINT "claims_guardian_required_ck" CHECK ("claims"."is_minor" = false or ("claims"."guardian_full_name" is not null and "claims"."guardian_document_type" is not null and "claims"."guardian_document_number" is not null)),
	CONSTRAINT "claims_detail_len_ck" CHECK (char_length("claims"."detail") <= 2000 and char_length("claims"."consumer_request") <= 1000)
);
--> statement-breakpoint
CREATE INDEX "claims_email_created_at_idx" ON "claims" USING btree ("email","created_at");