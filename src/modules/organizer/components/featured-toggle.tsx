"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { setEventFeaturedAction } from "@/modules/organizer/actions/event.actions";

interface FeaturedToggleProps {
  eventId: string;
  title: string;
  featured: boolean;
}

export function FeaturedToggle({ eventId, title, featured }: FeaturedToggleProps) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(featured);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !optimistic;
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setEventFeaturedAction({ id: eventId, featured: next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["events", "organizer"] });
    });
  }

  return (
    <span className="flex min-w-0 flex-col items-start">
      <button
        type="button"
        aria-pressed={optimistic}
        aria-label={optimistic ? `Quitar destacado de «${title}»` : `Destacar «${title}»`}
        disabled={pending}
        onClick={toggle}
        className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60 lg:h-7"
      >
        <Star
          className={cn("size-4", optimistic && "fill-current text-primary")}
          aria-hidden="true"
        />
        Destacado
      </button>
      {error && (
        <span role="alert" className="text-[0.8125rem] text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
