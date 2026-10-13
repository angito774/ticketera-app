import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTicketPdfDownload } from "@/modules/tickets/hooks/use-ticket-pdf-download";
import {
  downloadTicketPdf,
  TicketPdfDownloadError,
} from "@/modules/tickets/services/ticket-pdf-download.service";

vi.mock("@/modules/tickets/services/ticket-pdf-download.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/tickets/services/ticket-pdf-download.service")>()),
  downloadTicketPdf: vi.fn(),
}));

const download = vi.mocked(downloadTicketPdf);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useTicketPdfDownload", () => {
  const createObjectURL = vi.fn(() => "blob:fake");
  const revokeObjectURL = vi.fn();
  const open = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  beforeEach(() => {
    vi.resetAllMocks();
    createObjectURL.mockReturnValue("blob:fake");
    click.mockImplementation(() => {});
    vi.stubGlobal("open", open);
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("descarga con un enlace temporal, revoca la URL y no abre pestañas", async () => {
    download.mockResolvedValue({ blob: new Blob(["%PDF-"]), fileName: "entradas-TK-1.pdf" });
    const { result } = renderHook(() => useTicketPdfDownload("o1", "TK-1"), { wrapper });

    act(() => result.current.download());

    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake"));
    expect(download).toHaveBeenCalledWith("o1", "TK-1");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("muestra el mensaje según el status y permite reintentar", async () => {
    download.mockRejectedValue(new TicketPdfDownloadError(409));
    const { result } = renderHook(() => useTicketPdfDownload("o1", "TK-1"), { wrapper });

    act(() => result.current.download());

    await waitFor(() =>
      expect(result.current.error).toBe("Este pedido no tiene entradas descargables")
    );
    expect(result.current.isPending).toBe(false);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("usa el mensaje genérico ante un error sin status", async () => {
    download.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useTicketPdfDownload("o1", "TK-1"), { wrapper });

    act(() => result.current.download());

    await waitFor(() =>
      expect(result.current.error).toBe("No pudimos generar tu PDF. Inténtalo de nuevo.")
    );
  });
});
