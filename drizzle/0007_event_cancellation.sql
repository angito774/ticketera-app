CREATE TYPE "public"."cancellation_reason" AS ENUM('artist', 'natural_disaster', 'authority', 'venue', 'safety', 'other');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cancellation_reason" "cancellation_reason";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cancellation_note" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cancelled_at" timestamp with time zone;