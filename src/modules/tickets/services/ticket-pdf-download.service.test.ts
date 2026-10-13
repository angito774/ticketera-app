import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  downloadTicketPdf,
  TicketPdfDownloadError,
} from "@/modules/tickets/services/ticket-pdf-download.service";

vi.mock("axios", () => ({
  default: { get: vi.fn(), isAxiosError: vi.fn() },
}));

const get = vi.mocked(axios.get);
const isAxiosError = vi.mocked(axios.isAxiosError);

describe("downloadTicketPdf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("pide el PDF como blob y usa el nombre de Content-Disposition", async () => {
    const blob = new Blob(["%PDF-"]);
    get.mockResolvedValue({
      data: blob,
      headers: { "content-disposition": 'attachment; filename="entradas-TK-AAAA1111.pdf"' },
    });

    const result = await downloadTicketPdf("order-1", "TK-BBBB2222");

    expect(get).toHaveBeenCalledWith("/api/orders/order-1/tickets/pdf", { responseType: "blob" });
    expect(result).toEqual({ blob, fileName: "entradas-TK-AAAA1111.pdf" });
  });

  it("usa ticketPdfFileName si no hay Content-Disposition", async () => {
    get.mockResolvedValue({ data: new Blob(["x"]), headers: {} });

    const result = await downloadTicketPdf("order-1", "TK-BBBB2222");

    expect(result.fileName).toBe("entradas-TK-BBBB2222.pdf");
  });

  it("propaga el status HTTP del error", async () => {
    get.mockRejectedValue({ response: { status: 409 } });
    isAxiosError.mockReturnValue(true);

    await expect(downloadTicketPdf("order-1", "TK-1")).rejects.toMatchObject({
      name: "TicketPdfDownloadError",
      status: 409,
    });
  });

  it("deja status undefined ante un error de red", async () => {
    get.mockRejectedValue(new Error("Network Error"));
    isAxiosError.mockReturnValue(false);

    const error = await downloadTicketPdf("order-1", "TK-1").catch((e) => e);

    expect(error).toBeInstanceOf(TicketPdfDownloadError);
    expect(error.status).toBeUndefined();
  });
});
