export const CONNECT_ACCOUNT_EVENT_TYPES = [
  "v2.core.account.updated",
  "v2.core.account[requirements].updated",
  "v2.core.account[configuration.recipient].updated",
  "v2.core.account[configuration.recipient].capability_status_updated",
] as const;

/** Forma mínima de una notificación "thin" v2 que necesita el handler (compatible con `V2.Core.EventNotification`). */
export interface ConnectEventNotification {
  id: string;
  type: string;
  related_object?: { id?: string; type?: string } | null;
}

export interface ConnectEventDeps {
  hasProcessedEvent: (eventId: string) => Promise<boolean>;
  recordEvent: (event: { id: string; type: string }) => Promise<void>;
  findOrganizationIdByAccount: (accountId: string) => Promise<string | null>;
  syncConnectStatus: (organizationId: string) => Promise<unknown>;
  logError: (message: string, context: Record<string, string | null>) => void;
}

async function defaultDeps(): Promise<ConnectEventDeps> {
  const [{ db }, { organizations, stripeEvents }, { eq }, connect] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("drizzle-orm"),
    import("@/modules/payments/services/connect.service"),
  ]);
  return {
    hasProcessedEvent: async (eventId) => {
      const [row] = await db
        .select({ id: stripeEvents.id })
        .from(stripeEvents)
        .where(eq(stripeEvents.id, eventId))
        .limit(1);
      return Boolean(row);
    },
    recordEvent: async ({ id, type }) => {
      await db.insert(stripeEvents).values({ id, type }).onConflictDoNothing();
    },
    findOrganizationIdByAccount: async (accountId) => {
      const [row] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.stripeAccountId, accountId))
        .limit(1);
      return row?.id ?? null;
    },
    syncConnectStatus: connect.syncConnectStatus,
    logError: (message, context) => console.error(message, context),
  };
}

function isConnectAccountEvent(type: string): boolean {
  return (CONNECT_ACCOUNT_EVENT_TYPES as readonly string[]).includes(type);
}

/**
 * Sincronizar es idempotente por naturaleza; el evento se registra solo tras sincronizar para que un
 * fallo transitorio (la ruta responde 500) se reintente. Errores se propagan.
 */
export async function handleConnectEvent(
  event: ConnectEventNotification,
  deps?: ConnectEventDeps,
): Promise<void> {
  const resolved = deps ?? (await defaultDeps());

  if (await resolved.hasProcessedEvent(event.id)) return;

  if (isConnectAccountEvent(event.type)) {
    const accountId = event.related_object?.id;
    if (accountId) {
      const organizationId = await resolved.findOrganizationIdByAccount(accountId);
      if (organizationId) {
        await resolved.syncConnectStatus(organizationId);
      } else {
        resolved.logError("stripe.connect.webhook.unknown_account", { eventId: event.id });
      }
    } else {
      resolved.logError("stripe.connect.webhook.missing_related_object", { eventId: event.id });
    }
  }

  await resolved.recordEvent({ id: event.id, type: event.type });
}
