import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { sendEmail } from "./email";

const input = { to: "a@b.pe", subject: "Hola", html: "<p>x</p>" };

describe("sendEmail", () => {
  beforeEach(() => {
    send.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("devuelve false sin RESEND_API_KEY y no llama a Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendEmail(input)).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("devuelve true cuando Resend acepta el envío", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "T <t@x.pe>");
    send.mockResolvedValue({ data: { id: "1" }, error: null });
    await expect(sendEmail(input)).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: "T <t@x.pe>", to: "a@b.pe" }));
  });

  it("devuelve false si Resend responde con error", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "a@b.pe" } });
    await expect(sendEmail(input)).resolves.toBe(false);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("a@b.pe");
  });

  it("devuelve false sin lanzar ante un error de red", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    send.mockRejectedValue(new Error("network"));
    await expect(sendEmail(input)).resolves.toBe(false);
  });
});
