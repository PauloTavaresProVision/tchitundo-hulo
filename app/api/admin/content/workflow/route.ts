import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit-store";
import { listContentVersions, publishDraftSiteContent, restoreContentVersion } from "@/lib/content-store";
import { jsonRequestTooLarge } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await readAdminSession(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  return Response.json({ versions: await listContentVersions() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (jsonRequestTooLarge(request, 16_384)) return Response.json({ error: "Pedido demasiado grande." }, { status: 413 });
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  if (!session) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string; versionId?: string } | null;
  try {
    if (body?.action === "publish") {
      const content = await publishDraftSiteContent(session.username);
      await recordAudit({ action: "content.published", outcome: "success", request, userId: session.userId, username: session.username });
      return Response.json({ content, publishedAt: new Date().toISOString() });
    }
    if (body?.action === "restore" && body.versionId) {
      const content = await restoreContentVersion(body.versionId);
      await recordAudit({ action: "content.version_restored", outcome: "success", request, userId: session.userId, username: session.username, target: body.versionId });
      return Response.json({ content, restoredAt: new Date().toISOString() });
    }
    return Response.json({ error: "Operação inválida." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível concluir a operação." }, { status: 400 });
  }
}
