import { relations } from "drizzle-orm";
import { events } from "./events";
import { organizationMembers, organizations, roles, users } from "./identity";
import { notifications, orderItems, orders, tickets } from "./orders";
import { coupons, eventSeats, ticketHolds, ticketTypes } from "./ticketing";
import { categories, venueSeats, venueZones, venues } from "./venues";

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  orders: many(orders),
  notifications: many(notifications),
  holds: many(ticketHolds),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  venues: many(venues),
  events: many(events),
  coupons: many(coupons),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
    role: one(roles, {
      fields: [organizationMembers.roleId],
      references: [roles.id],
    }),
  }),
);

export const rolesRelations = relations(roles, ({ many }) => ({
  members: many(organizationMembers),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  events: many(events),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [venues.organizationId],
    references: [organizations.id],
  }),
  zones: many(venueZones),
  events: many(events),
}));

export const venueZonesRelations = relations(venueZones, ({ one, many }) => ({
  venue: one(venues, { fields: [venueZones.venueId], references: [venues.id] }),
  seats: many(venueSeats),
  ticketTypes: many(ticketTypes),
}));

export const venueSeatsRelations = relations(venueSeats, ({ one, many }) => ({
  zone: one(venueZones, {
    fields: [venueSeats.venueZoneId],
    references: [venueZones.id],
  }),
  eventSeats: many(eventSeats),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  venue: one(venues, { fields: [events.venueId], references: [venues.id] }),
  category: one(categories, {
    fields: [events.categoryId],
    references: [categories.id],
  }),
  ticketTypes: many(ticketTypes),
  seats: many(eventSeats),
  orders: many(orders),
}));

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketTypes.eventId],
    references: [events.id],
  }),
  zone: one(venueZones, {
    fields: [ticketTypes.venueZoneId],
    references: [venueZones.id],
  }),
  seats: many(eventSeats),
  holds: many(ticketHolds),
  orderItems: many(orderItems),
}));

export const eventSeatsRelations = relations(eventSeats, ({ one }) => ({
  event: one(events, { fields: [eventSeats.eventId], references: [events.id] }),
  venueSeat: one(venueSeats, {
    fields: [eventSeats.venueSeatId],
    references: [venueSeats.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [eventSeats.ticketTypeId],
    references: [ticketTypes.id],
  }),
}));

export const ticketHoldsRelations = relations(ticketHolds, ({ one }) => ({
  ticketType: one(ticketTypes, {
    fields: [ticketHolds.ticketTypeId],
    references: [ticketTypes.id],
  }),
  eventSeat: one(eventSeats, {
    fields: [ticketHolds.eventSeatId],
    references: [eventSeats.id],
  }),
  user: one(users, { fields: [ticketHolds.userId], references: [users.id] }),
}));

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [coupons.organizationId],
    references: [organizations.id],
  }),
  event: one(events, { fields: [coupons.eventId], references: [events.id] }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  event: one(events, { fields: [orders.eventId], references: [events.id] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  ticketType: one(ticketTypes, {
    fields: [orderItems.ticketTypeId],
    references: [ticketTypes.id],
  }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [tickets.orderItemId],
    references: [orderItems.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [tickets.ticketTypeId],
    references: [ticketTypes.id],
  }),
  eventSeat: one(eventSeats, {
    fields: [tickets.eventSeatId],
    references: [eventSeats.id],
  }),
  redeemer: one(users, {
    fields: [tickets.redeemedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
