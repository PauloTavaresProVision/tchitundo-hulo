import { readMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    const media = await readMedia(decodeURIComponent(filename));
    const headers: Record<string, string> = {
      "Content-Type": media.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    if (media.type === "application/pdf") headers["Content-Disposition"] = `attachment; filename="documento-${filename.slice(0, 8)}.pdf"`;
    return new Response(media.bytes, {
      headers,
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
