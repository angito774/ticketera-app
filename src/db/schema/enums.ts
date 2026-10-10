import { pgEnum } from "drizzle-orm/pg-core";

export const stripeConnectStatus = pgEnum("stripe_connect_status", [
  "not_started",
  "pending",
  "active",
  "restricted",
]);
export const zoneSeating = pgEnum("zone_seating", ["general", "numbered"]);
export const eventStatus = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
]);
export const seatStatus = pgEnum("seat_status", ["available", "held", "sold"]);
export const discountType = pgEnum("discount_type", [
  "percentage",
  "fixed_amount",
]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "cancelled",
  "refunded",
]);
export const ticketStatus = pgEnum("ticket_status", [
  "valid",
  "redeemed",
  "cancelled",
]);
export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);
export const settlementStatus = pgEnum("settlement_status", [
  "pending",
  "paid",
  "failed",
]);
