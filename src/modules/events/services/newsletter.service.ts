import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";

export async function subscribeToNewsletter(email: string): Promise<void> {
  await db
    .insert(newsletterSubscribers)
    .values({ email })
    .onConflictDoNothing({ target: newsletterSubscribers.email });
}
