export const dynamic = "force-dynamic";

// Health check para el despliegue: responde sin tocar la base de datos.
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
