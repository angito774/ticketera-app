import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useUser: vi.fn(),
  useSession: vi.fn(),
  signOut: vi.fn(),
  endImpersonationAction: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: mocks.useAuth,
  useUser: mocks.useUser,
  useSession: mocks.useSession,
  useClerk: () => ({ signOut: mocks.signOut }),
}));

vi.mock("@/modules/admin/actions/impersonation.actions", () => ({
  endImpersonationAction: mocks.endImpersonationAction,
}));

import { ImpersonationBanner } from "./impersonation-banner";

function setup({
  actor = { sub: "admin_1" } as unknown,
  isLoaded = true,
  fullName = "Ana Pérez" as string | null,
  expireAt = new Date(Date.now() + 30 * 60_000) as Date | undefined,
} = {}) {
  mocks.useAuth.mockReturnValue({ isLoaded, actor });
  mocks.useUser.mockReturnValue({
    user: { fullName, primaryEmailAddress: { emailAddress: "ana@example.com" } },
  });
  mocks.useSession.mockReturnValue({ session: expireAt ? { expireAt } : undefined });
}

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.style.removeProperty("--impersonation-banner-h");
  });

  it("renders nothing without actor", () => {
    setup({ actor: null });
    const { container } = render(<ImpersonationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while Clerk is not loaded", () => {
    setup({ isLoaded: false });
    const { container } = render(<ImpersonationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the target name, email and end button", () => {
    setup();
    render(<ImpersonationBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Estás actuando como Ana Pérez (ana@example.com)",
    );
    expect(screen.getByRole("button", { name: "Dejar de impersonar" })).toBeEnabled();
  });

  it("falls back to the email when there is no full name", () => {
    setup({ fullName: null });
    render(<ImpersonationBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Estás actuando como ana@example.com (ana@example.com)",
    );
  });

  it("shows the expiry time without warning when far from expiring", () => {
    setup();
    render(<ImpersonationBanner />);
    expect(screen.getByText(/Expira a las \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.queryByText("Tu sesión de impersonación está por expirar")).toBeNull();
  });

  it("warns when under 5 minutes remain and re-evaluates every 30 s", () => {
    vi.useFakeTimers();
    setup({ expireAt: new Date(Date.now() + 5 * 60_000 + 10_000) });
    render(<ImpersonationBanner />);
    expect(screen.queryByText("Tu sesión de impersonación está por expirar")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText("Tu sesión de impersonación está por expirar")).toBeInTheDocument();
  });

  it("publishes and removes the banner height variable", () => {
    setup();
    const { unmount } = render(<ImpersonationBanner />);
    expect(document.documentElement.style.getPropertyValue("--impersonation-banner-h")).toBe("0px");
    unmount();
    expect(document.documentElement.style.getPropertyValue("--impersonation-banner-h")).toBe("");
  });

  it("ends impersonation once, disables the button and signs out", async () => {
    setup();
    let resolve!: (value: { ok: true }) => void;
    mocks.endImpersonationAction.mockReturnValue(new Promise((r) => (resolve = r)));
    mocks.signOut.mockResolvedValue(undefined);
    render(<ImpersonationBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Dejar de impersonar" }));
    const button = screen.getByRole("button", { name: "Cerrando…" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.endImpersonationAction).toHaveBeenCalledTimes(1);

    resolve({ ok: true });
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-in" }));
  });

  it("falls back to window.location.assign when signOut rejects", async () => {
    setup();
    mocks.endImpersonationAction.mockResolvedValue({ ok: true });
    mocks.signOut.mockRejectedValue(new Error("revoked"));
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { value: { assign }, configurable: true });
    try {
      render(<ImpersonationBanner />);
      fireEvent.click(screen.getByRole("button", { name: "Dejar de impersonar" }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith("/sign-in"));
    } finally {
      Object.defineProperty(window, "location", { value: original, configurable: true });
    }
  });

  it("shows the error and does not redirect when the action fails", async () => {
    setup();
    mocks.endImpersonationAction.mockResolvedValue({ ok: false, error: "No hay una impersonación activa" });
    render(<ImpersonationBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Dejar de impersonar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No hay una impersonación activa");
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Dejar de impersonar" })).toBeEnabled();
  });
});
