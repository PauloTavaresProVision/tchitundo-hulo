import { readAdminSession } from "@/lib/admin-auth";
import { readDraftSiteContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await readAdminSession(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  return new Response(`${JSON.stringify(await readDraftSiteContent(), null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=tchitundo-hulo-conteudos.json", "Cache-Control": "no-store" },
  });
}
