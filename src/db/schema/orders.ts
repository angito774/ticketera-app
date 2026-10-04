import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, timestamps, tstz } from "./columns";
import { notificationStatus, orderStatus, ticketStatus } from "./enums";
import { events } from "./events";
import { users } from "./identity";
import { coupons, eventSeats, ticketTypes } from "./ticketing";

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    status: orderStatus().notNull().default("pending"),
    stripeCheckoutSessionId: text().unique(),
    stripePaymentIntentId: text().unique(),
    totalAmount: integer().notNull(), // centavos
    currency: text().notNull().default("PEN"),
    applicationFeeAmount: integer(),
    couponId: uuid().references(() => coupons.id, { onDelete: "set null" }),
    discountAmount: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_event_status_idx").on(t.eventId, t.status),
    index("orders_coupon_idx").on(t.couponId),
    check("orders_total_amount_check", sql`${t.totalAmount} >= 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    ticketTypeId: uuid()
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "restrict" }),
    quantity: integer().notNull(),
    unitPrice: integer().notNull(), // snapshot, centavos
    createdAt: createdAt(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_ticket_type_idx").on(t.ticketTypeId),
    check("order_items_quantity_check", sql`${t.quantity} > 0`),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderItemId: uuid()
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    ticketTypeId: uuid()
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "restrict" }),
    // Un asiento solo puede estar en una entrada (unique permite varios NULL).
    eventSeatId: uuid()
      .unique()
      .references(() => eventSeats.id, { onDelete: "restrict" }),
    qrCode: text().notNull().unique(),
    status: ticketStatus().notNull().default("valid"),
    redeemedAt: tstz(),
    redeemedBy: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("tickets_order_item_idx").on(t.orderItemId),
    index("tickets_ticket_type_idx").on(t.ticketTypeId),
    index("tickets_redeemed_by_idx").on(t.redeemedBy),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    channel: text().notNull().default("email"),
    status: notificationStatus().notNull().default("pending"),
    payload: jsonb(),
    sentAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_status_idx").on(t.userId, t.status)],
);
