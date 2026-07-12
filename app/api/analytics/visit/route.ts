import { sameOrigin } from "@/lib/admin-auth";
import { recordVisit } from "@/lib/analytics-store";
import { allowRequest } from "@/lib/request-rate-limit";
import { jsonRequestTooLarge } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!allowRequest(request, "analytics", 180) || jsonRequestTooLarge(request, 4_096)) return new Response(null, { status: 429 });
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const body = await request.json().catch(() => null) as { sessionId?: string; device?: string; referrer?: string } | null;
  if (!body?.sessionId) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  await recordVisit({ sessionId: body.sessionId, device: body.device ?? "desktop", referrer: body.referrer ?? "Directo" });
  return new Response(null, { status: 204 });
}
