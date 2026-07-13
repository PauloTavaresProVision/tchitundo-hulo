export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { status: "ok", service: "tchitundo-hulo", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
