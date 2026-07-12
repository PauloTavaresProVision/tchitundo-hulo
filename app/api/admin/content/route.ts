import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { readSiteContent, writeSiteContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await readAdminSession(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  return Response.json(await readSiteContent(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  if (!await readAdminSession(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const content = await writeSiteContent(await request.json());
    return Response.json({ content, savedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível guardar os conteúdos.";
    return Response.json({ error: message }, { status: 400 });
  }
}
