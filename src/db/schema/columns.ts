import { timestamp } from "drizzle-orm/pg-core";

export const tstz = () => timestamp({ withTimezone: true });

export const createdAt = () => tstz().notNull().defaultNow();

export const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: tstz()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
