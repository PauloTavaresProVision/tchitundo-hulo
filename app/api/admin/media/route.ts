import { readAdminSession } from "@/lib/admin-auth";
import { listMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await readAdminSession(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  return Response.json({ media: await listMedia() }, { headers: { "Cache-Control": "no-store" } });
}
