import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit-store";
import { readDraftSiteContent, saveDraftSiteContent } from "@/lib/content-store";
import { jsonRequestTooLarge } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await readAdminSession(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  return Response.json(await readDraftSiteContent(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (jsonRequestTooLarge(request)) return Response.json({ error: "Pedido demasiado grande." }, { status: 413 });
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  if (!session) return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const content = await saveDraftSiteContent(await request.json());
    await recordAudit({ action: "content.draft_saved", outcome: "success", request, userId: session.userId, username: session.username, detail: { gallery: content.gallery.length, agenda: content.agenda.length, documents: content.documents.length } });
    return Response.json({ content, savedAt: new Date().toISOString(), status: "draft" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível guardar o rascunho.";
    return Response.json({ error: message }, { status: 400 });
  }
}
