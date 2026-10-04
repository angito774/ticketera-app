"use client";

import type { FormEvent } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EventSearchBarProps {
  defaultQuery: string;
  onSearch: (query: string) => void;
  className?: string;
}

/** Buscador de texto de la página de resultados. Para que se reinicie al cambiar la URL, usar `key={query}`. */
export function EventSearchBar({ defaultQuery, onSearch, className }: EventSearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(String(new FormData(event.currentTarget).get("q") ?? ""));
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn("flex gap-2 rounded-2xl border bg-card p-2 shadow-sm", className)}
    >
      <label className="relative flex-1">
        <span className="sr-only">Buscar eventos</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          name="q"
          defaultValue={defaultQuery}
          placeholder="Artista, evento o ciudad"
          className="h-12 rounded-xl border-0 pl-10 text-base md:text-[0.9375rem]"
        />
      </label>
      <Button type="submit" variant="cta" className="h-12 rounded-xl px-5 text-[0.9375rem]">
        <Search className="size-4 lg:hidden" aria-hidden="true" />
        <span className="max-lg:sr-only">Buscar</span>
      </Button>
    </form>
  );
}
