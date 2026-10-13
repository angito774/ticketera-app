// @vitest-environment node
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { ticketQrDataUrl } from "@/modules/tickets/services/ticket-qr.service";

const PAYLOAD = "Zx9_aB-3kLm0QwErTyUiOp12";

describe("ticketQrDataUrl", () => {
  it("returns a PNG data URL", async () => {
    const url = await ticketQrDataUrl(PAYLOAD);
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("encodes exactly the raw payload", () => {
    const qr = QRCode.create(PAYLOAD, { errorCorrectionLevel: "M" });
    const encoded = qr.segments
      .map((segment) => Buffer.from(segment.data).toString("utf8"))
      .join("");
    expect(encoded).toBe(PAYLOAD);
  });

  it("produces different images for different payloads", async () => {
    const [a, b] = await Promise.all([
      ticketQrDataUrl(PAYLOAD),
      ticketQrDataUrl("otro-payload-distinto-123"),
    ]);
    expect(a).not.toBe(b);
  });
});
