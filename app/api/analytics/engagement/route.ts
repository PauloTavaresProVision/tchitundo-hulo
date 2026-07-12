import { sameOrigin } from "@/lib/admin-auth";
import { recordEngagement } from "@/lib/analytics-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const body = await request.json().catch(() => null) as { sessionId?: string; totalDurationMs?: number; sectionDurations?: Record<string, number>; sectionEntries?: string[] } | null;
  if (!body?.sessionId || !body.sectionDurations) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  await recordEngagement({
    sessionId: body.sessionId,
    totalDurationMs: Number(body.totalDurationMs ?? 0),
    sectionDurations: body.sectionDurations,
    sectionEntries: Array.isArray(body.sectionEntries) ? body.sectionEntries : [],
  });
  return new Response(null, { status: 204 });
}
