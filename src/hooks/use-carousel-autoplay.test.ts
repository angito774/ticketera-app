import { act, renderHook } from "@testing-library/react";
import type { FocusEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CarouselApi } from "@/components/ui/carousel";
import { useCarouselAutoplay } from "@/hooks/use-carousel-autoplay";

const plugin = vi.hoisted(() => ({
  play: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
}));
const autoplayFactory = vi.hoisted(() => vi.fn());

vi.mock("embla-carousel-autoplay", () => ({
  default: (options: unknown) => {
    autoplayFactory(options);
    return plugin;
  },
}));

type Listener = () => void;

function createApi() {
  const listeners = new Map<string, Set<Listener>>();
  const api = {
    on: vi.fn((event: string, cb: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return api;
    }),
    off: vi.fn((event: string, cb: Listener) => {
      listeners.get(event)?.delete(cb);
      return api;
    }),
  };
  const emit = (event: string) => listeners.get(event)?.forEach((cb) => cb());
  return { api: api as unknown as NonNullable<CarouselApi>, emit };
}

let reduced = false;
let mediaListeners = new Set<Listener>();

function mockMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, cb: Listener) => mediaListeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => mediaListeners.delete(cb),
  })) as unknown as typeof window.matchMedia;
}

function setReduced(value: boolean) {
  reduced = value;
  act(() => mediaListeners.forEach((cb) => cb()));
}

function setHidden(value: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

function setup(enabled = true) {
  const harness = createApi();
  const hook = renderHook(() => useCarouselAutoplay({ delay: 6000, enabled }));
  act(() => hook.result.current.setApi(harness.api));
  return { ...hook, ...harness };
}

const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.invocationCallOrder.at(-1) ?? 0;
const isPlaying = () => lastCall(plugin.play) > lastCall(plugin.stop);

function blurEvent(inside: boolean) {
  const container = document.createElement("div");
  const inner = document.createElement("button");
  container.appendChild(inner);
  return {
    currentTarget: container,
    relatedTarget: inside ? inner : document.createElement("a"),
  } as unknown as FocusEvent<HTMLElement>;
}

beforeEach(() => {
  reduced = false;
  mediaListeners = new Set();
  mockMatchMedia();
  setHidden(false);
  plugin.play.mockClear();
  plugin.stop.mockClear();
  plugin.reset.mockClear();
  autoplayFactory.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCarouselAutoplay", () => {
  it("creates the plugin with playOnInit false and no built-in stop policies", () => {
    setup();
    expect(autoplayFactory).toHaveBeenCalledWith({
      delay: 6000,
      playOnInit: false,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
    });
  });

  it("plays when there is no pause reason", () => {
    const { result } = setup();
    expect(result.current.isRunning).toBe(true);
    expect(isPlaying()).toBe(true);
  });

  it("never runs when disabled", () => {
    const { result } = setup(false);
    expect(result.current.canAutoplay).toBe(false);
    expect(result.current.isRunning).toBe(false);
    expect(plugin.play).not.toHaveBeenCalled();
  });

  it("pauses on mouse enter and resumes on leave", () => {
    const { result } = setup();
    act(() => result.current.containerProps.onMouseEnter());
    expect(isPlaying()).toBe(false);
    act(() => result.current.containerProps.onMouseLeave());
    expect(isPlaying()).toBe(true);
  });

  it("pauses while focus is inside and resumes when it leaves", () => {
    const { result } = setup();
    act(() => result.current.containerProps.onFocus());
    expect(isPlaying()).toBe(false);
    act(() => result.current.containerProps.onBlur(blurEvent(false)));
    expect(isPlaying()).toBe(true);
  });

  it("does not resume when focus moves between inner elements", () => {
    const { result } = setup();
    act(() => result.current.containerProps.onFocus());
    act(() => result.current.containerProps.onBlur(blurEvent(true)));
    expect(result.current.isRunning).toBe(false);
    expect(isPlaying()).toBe(false);
  });

  it("pauses between pointerDown and pointerUp", () => {
    const { result, emit } = setup();
    act(() => emit("pointerDown"));
    expect(isPlaying()).toBe(false);
    act(() => emit("pointerUp"));
    expect(result.current.isRunning).toBe(true);
    expect(isPlaying()).toBe(true);
  });

  it("toggle pauses and resumes by user choice", () => {
    const { result } = setup();
    act(() => result.current.toggle());
    expect(result.current.userPaused).toBe(true);
    expect(isPlaying()).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.userPaused).toBe(false);
    expect(isPlaying()).toBe(true);
  });

  it("stays paused until every reason is gone", () => {
    const { result } = setup();
    act(() => result.current.toggle());
    act(() => result.current.containerProps.onMouseEnter());
    act(() => result.current.containerProps.onMouseLeave());
    expect(isPlaying()).toBe(false);
  });

  it("stops while the tab is hidden and resumes when visible", () => {
    const { result } = setup();
    setHidden(true);
    expect(result.current.isRunning).toBe(false);
    expect(isPlaying()).toBe(false);
    setHidden(false);
    expect(isPlaying()).toBe(true);
  });

  it("does not resume on visible while another pause reason holds", () => {
    const { result } = setup();
    act(() => result.current.containerProps.onMouseEnter());
    setHidden(true);
    setHidden(false);
    expect(result.current.isRunning).toBe(false);
  });

  it("does not autoplay under reduced motion and follows live changes", () => {
    reduced = true;
    const { result } = setup();
    expect(result.current.canAutoplay).toBe(false);
    expect(plugin.play).not.toHaveBeenCalled();

    setReduced(false);
    expect(result.current.canAutoplay).toBe(true);
    expect(isPlaying()).toBe(true);

    setReduced(true);
    expect(result.current.canAutoplay).toBe(false);
    expect(isPlaying()).toBe(false);
  });

  it("increments runId each time it starts running", () => {
    const { result } = setup();
    const first = result.current.runId;
    expect(first).toBeGreaterThan(0);
    act(() => result.current.containerProps.onMouseEnter());
    expect(result.current.runId).toBe(first);
    act(() => result.current.containerProps.onMouseLeave());
    expect(result.current.runId).toBe(first + 1);
  });

  it("resets the plugin timer on select", () => {
    const { emit } = setup();
    act(() => emit("select"));
    expect(plugin.reset).toHaveBeenCalled();
  });

  it("removes api listeners on unmount", () => {
    const { unmount, api } = setup();
    unmount();
    expect(api.off).toHaveBeenCalledWith("pointerDown", expect.any(Function));
    expect(api.off).toHaveBeenCalledWith("pointerUp", expect.any(Function));
    expect(api.off).toHaveBeenCalledWith("select", expect.any(Function));
  });
});
