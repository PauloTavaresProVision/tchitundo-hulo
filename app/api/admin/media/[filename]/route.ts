import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit-store";
import { readDraftSiteContent, readSiteContent } from "@/lib/content-store";
import { deleteMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ filename: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  if (!session || session.role !== "admin") return Response.json({ error: "Não autorizado." }, { status: 403 });
  try {
    const { filename } = await context.params;
    const decodedFilename = decodeURIComponent(filename);
    const mediaUrl = `/api/media/${encodeURIComponent(decodedFilename)}`;
    const [published, draft] = await Promise.all([readSiteContent(), readDraftSiteContent()]);
    if (JSON.stringify(published).includes(mediaUrl) || JSON.stringify(draft).includes(mediaUrl)) {
      return Response.json({ error: "O ficheiro está a ser utilizado no website ou no rascunho." }, { status: 409 });
    }
    await deleteMedia(decodedFilename);
    await recordAudit({ action: "media.deleted", outcome: "success", request, userId: session.userId, username: session.username, target: filename });
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível eliminar o ficheiro." }, { status: 400 });
  }
}
