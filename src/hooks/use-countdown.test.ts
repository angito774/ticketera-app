import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCountdown } from "@/hooks/use-countdown";

const NOW = new Date("2026-09-29T17:00:00Z");
const inSeconds = (seconds: number) => new Date(NOW.getTime() + seconds * 1000).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("returns the remaining time as mm:ss", () => {
    const { result } = renderHook(() => useCountdown(inSeconds(588)));
    expect(result.current).toEqual({ secondsLeft: 588, isExpired: false, label: "09:48" });
  });

  it("ticks every second", () => {
    const { result } = renderHook(() => useCountdown(inSeconds(10)));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsLeft).toBe(7);
    expect(result.current.label).toBe("00:07");
  });

  it("stops at zero and flags expiration", () => {
    const { result } = renderHook(() => useCountdown(inSeconds(2)));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toEqual({ secondsLeft: 0, isExpired: true, label: "00:00" });
  });

  it("is expired for a past target or without target", () => {
    expect(renderHook(() => useCountdown(inSeconds(-30))).result.current.isExpired).toBe(true);
    expect(renderHook(() => useCountdown(null)).result.current.isExpired).toBe(true);
  });
});

describe("useCountdown sync", () => {
  it("resyncs with the clock right away when the target changes", () => {
    const { result, rerender } = renderHook(({ target }) => useCountdown(target), {
      initialProps: { target: null as string | null },
    });
    vi.setSystemTime(new Date(NOW.getTime() + 5000));
    rerender({ target: new Date(NOW.getTime() + 5000 + 600_000).toISOString() });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.label).toBe("10:00");
  });
});
