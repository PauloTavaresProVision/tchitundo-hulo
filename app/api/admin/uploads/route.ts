import { readAdminSession, sameOrigin } from "@/lib/admin-auth";
import { saveMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Pedido inválido." }, { status: 403 });
  if (!await readAdminSession(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Seleccione um ficheiro." }, { status: 400 });
    return Response.json(await saveMedia(file));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o ficheiro.";
    return Response.json({ error: message }, { status: 400 });
  }
}
