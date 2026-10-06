"use client";

import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { CarouselApi } from "@/components/ui/carousel";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export interface UseCarouselAutoplayOptions {
  delay: number;
  enabled: boolean;
}

export interface UseCarouselAutoplayResult {
  plugin: ReturnType<typeof Autoplay>;
  setApi: (api: CarouselApi) => void;
  api: CarouselApi | undefined;
  canAutoplay: boolean;
  userPaused: boolean;
  isRunning: boolean;
  runId: number;
  toggle: () => void;
  containerProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: (e: React.FocusEvent<HTMLElement>) => void;
  };
}

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function useCarouselAutoplay({
  delay,
  enabled,
}: UseCarouselAutoplayOptions): UseCarouselAutoplayResult {
  const plugin = useMemo(
    () =>
      Autoplay({
        delay,
        playOnInit: false,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
        stopOnFocusIn: false,
      }),
    [delay],
  );

  const [api, setApi] = useState<CarouselApi>();
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true,
  );
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  );

  const canAutoplay = enabled && !reducedMotion;
  const isRunning = canAutoplay && !userPaused && !hovered && !focused && !dragging && !hidden;

  const [runId, setRunId] = useState(0);
  const [wasRunning, setWasRunning] = useState(false);
  if (isRunning !== wasRunning) {
    setWasRunning(isRunning);
    if (isRunning) setRunId((id) => id + 1);
  }

  useEffect(() => {
    if (!api) return;
    if (isRunning) plugin.play();
    else plugin.stop();
  }, [api, plugin, isRunning]);

  useEffect(() => {
    if (!api) return;
    const onPointerDown = () => setDragging(true);
    const onPointerUp = () => setDragging(false);
    const onSelect = () => plugin.reset();
    api.on("pointerDown", onPointerDown);
    api.on("pointerUp", onPointerUp);
    api.on("select", onSelect);
    return () => {
      api.off("pointerDown", onPointerDown);
      api.off("pointerUp", onPointerUp);
      api.off("select", onSelect);
    };
  }, [api, plugin]);

  const toggle = useCallback(() => setUserPaused((paused) => !paused), []);

  const containerProps = useMemo(
    () => ({
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: (e: React.FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      },
    }),
    [],
  );

  return { plugin, setApi, api, canAutoplay, userPaused, isRunning, runId, toggle, containerProps };
}
