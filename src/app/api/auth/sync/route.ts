import { getCurrentUser } from "@/modules/auth/services/current-user.service";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401, headers: NO_STORE });
    }
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    console.error("POST /api/auth/sync failed", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500, headers: NO_STORE });
  }
}
