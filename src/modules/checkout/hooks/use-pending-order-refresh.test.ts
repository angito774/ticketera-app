import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_POLL_MAX,
  PENDING_POLL_MS,
  usePendingOrderRefresh,
} from "@/modules/checkout/hooks/use-pending-order-refresh";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePendingOrderRefresh", () => {
  it("refreshes on every interval while active", () => {
    const refresh = vi.fn();
    renderHook(() => usePendingOrderRefresh(true, refresh));
    act(() => {
      vi.advanceTimersByTime(PENDING_POLL_MS * 2);
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stops after the maximum attempts and reports exhaustion", () => {
    const refresh = vi.fn();
    const { result } = renderHook(() => usePendingOrderRefresh(true, refresh));
    expect(result.current.exhausted).toBe(false);
    act(() => {
      vi.advanceTimersByTime(PENDING_POLL_MS * (PENDING_POLL_MAX + 5));
    });
    expect(refresh).toHaveBeenCalledTimes(PENDING_POLL_MAX);
    expect(result.current.exhausted).toBe(true);
  });

  it("does nothing while inactive", () => {
    const refresh = vi.fn();
    const { result } = renderHook(() => usePendingOrderRefresh(false, refresh));
    act(() => {
      vi.advanceTimersByTime(PENDING_POLL_MS * 3);
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.exhausted).toBe(false);
  });
});
