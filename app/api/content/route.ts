import { readSiteContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await readSiteContent(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Não foi possível carregar os conteúdos." }, { status: 500 });
  }
}
