export type LifecycleEventStatus = "draft" | "published" | "cancelled";

export function canDeleteEvent(e: { status: LifecycleEventStatus; orderCount: number }): boolean {
  return e.orderCount === 0;
}

export function canCancelEvent(e: { status: LifecycleEventStatus }): boolean {
  return e.status === "published";
}
