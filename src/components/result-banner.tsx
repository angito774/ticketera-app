import { cn } from "@/lib/utils";

interface ResultBannerProps {
  text: string;
  tone: "ok" | "error";
}

export function ResultBanner({ text, tone }: ResultBannerProps) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm break-words",
        tone === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted",
      )}
    >
      {text}
    </p>
  );
}
