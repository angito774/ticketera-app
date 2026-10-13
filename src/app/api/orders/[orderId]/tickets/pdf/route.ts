import { getCurrentUser } from "@/modules/auth/services/current-user.service";
import { generateTicketPdfForUser } from "@/modules/tickets/services/ticket-pdf-access.service";
import { ticketPdfErrorMessage } from "@/modules/tickets/services/ticket-pdf.mapping";

export const runtime = "nodejs";

const NO_STORE = "no-store";

function errorResponse(status: number) {
  return Response.json(
    { error: ticketPdfErrorMessage(status) },
    { status, headers: { "Cache-Control": NO_STORE } }
  );
}

export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[orderId]/tickets/pdf">) {
  try {
    const { orderId } = await ctx.params;
    const actor = await getCurrentUser();
    const result = await generateTicketPdfForUser(actor, orderId);

    if (!result.ok) return errorResponse(result.status);

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/orders/[orderId]/tickets/pdf failed", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500, headers: { "Cache-Control": NO_STORE } }
    );
  }
}
