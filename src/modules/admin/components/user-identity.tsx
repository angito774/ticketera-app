import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserIdentity {
  fullName: string | null;
  email: string;
}

export function displayName({ fullName, email }: UserIdentity) {
  return fullName ?? email;
}

export function initials(user: UserIdentity) {
  const parts = displayName(user).trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export function UserCell({ fullName, email }: UserIdentity) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
      >
        {initials({ fullName, email })}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{displayName({ fullName, email })}</p>
        {fullName && <p className="truncate text-xs text-muted-foreground">{email}</p>}
      </div>
    </div>
  );
}

export function RoleBadge({ label }: { label: string }) {
  return (
    <Badge variant="secondary" className="h-6 bg-muted px-2.5 text-muted-foreground">
      {label}
    </Badge>
  );
}

export function StatusLabel({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        verified ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400",
      )}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {verified ? "Verificado" : "Pendiente"}
    </span>
  );
}
