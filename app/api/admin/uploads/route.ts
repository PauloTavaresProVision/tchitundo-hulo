import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit-store";
import { saveMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 501 * 1024 * 1024) return Response.json({ error: "Pedido demasiado grande." }, { status: 413 });
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  const session = await readAdminSession(request);
  if (!session) return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Seleccione um ficheiro." }, { status: 400 });
    const media = await saveMedia(file);
    await recordAudit({ action: "media.uploaded", outcome: "success", request, userId: session.userId, username: session.username, target: media.filename, detail: { type: media.type, size: media.size } });
    return Response.json(media);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o ficheiro.";
    return Response.json({ error: message }, { status: 400 });
  }
}
