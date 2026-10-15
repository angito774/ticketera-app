import { describe, expect, it } from "vitest";

import { buildRefundEmail } from "./refund-email";

const base = { eventTitle: "Rock Fest", reasonLabel: "Orden de una autoridad", amountCents: 35000, orderNumber: "TK-ABC12345" };

describe("buildRefundEmail", () => {
  it("incluye título, monto, motivo, número de orden y plazo", () => {
    const { subject, html } = buildRefundEmail(base);
    expect(subject).toContain("TK-ABC12345");
    expect(html).toContain("Rock Fest");
    expect(html).toContain("350");
    expect(html).toContain("Orden de una autoridad");
    expect(html).toContain("TK-ABC12345");
    expect(html).toContain("máximo 15 días hábiles");
  });

  it("omite el motivo cuando no existe", () => {
    expect(buildRefundEmail({ ...base, reasonLabel: null }).html).not.toContain("Motivo");
  });

  it("escapa HTML en título y motivo", () => {
    const { html } = buildRefundEmail({
      ...base,
      eventTitle: "<script>alert(1)</script>",
      reasonLabel: '"><img src=x>',
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });
});
