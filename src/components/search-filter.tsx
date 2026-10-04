"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

export type UpdateParams = (changes: Record<string, string>) => void;

interface SearchFilterProps {
  param?: string;
  label: string;
  placeholder: string;
  clearLabel: string;
  /** Params removed by the clear button; it shows while any of them is in the URL. Defaults to [param]. */
  clearKeys?: readonly string[];
  /** Extra controls rendered after the search box; `update` sets/removes params and resets pagination. */
  children?: (update: UpdateParams) => ReactNode;
}

export function SearchFilter({
  param = "q",
  label,
  placeholder,
  clearLabel,
  clearKeys = [param],
  children,
}: SearchFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const urlQuery = searchParams.get(param) ?? "";
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const update: UpdateParams = (changes) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  function onSearchChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => update({ [param]: value.trim() }),
      DEBOUNCE_MS,
    );
  }

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    setQuery("");
    update(Object.fromEntries(clearKeys.map((key) => [key, ""])));
  }

  const hasFilters = clearKeys.some((key) => searchParams.has(key));

  return (
    <div role="search" className="flex flex-wrap items-end gap-3">
      <div className="relative w-full sm:max-w-xs sm:flex-1">
        <label htmlFor={searchId} className="sr-only">
          {label}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={searchId}
          ref={inputRef}
          type="search"
          value={query}
          maxLength={80}
          placeholder={placeholder}
          className="h-11 pl-9 md:h-10"
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {children?.(update)}
      {hasFilters && (
        <Button type="button" variant="ghost" className="h-11 md:h-10" onClick={clear}>
          {clearLabel}
        </Button>
      )}
    </div>
  );
}
