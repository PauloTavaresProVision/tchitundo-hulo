import { mediaInfo, readMedia, readMediaRange } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename: rawFilename } = await context.params;
    const filename = decodeURIComponent(rawFilename);
    const info = await mediaInfo(filename);
    const range = request.headers.get("range");
    const baseHeaders: Record<string, string> = {
      "Content-Type": info.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    };
    if (info.type === "application/pdf") baseHeaders["Content-Disposition"] = `attachment; filename="documento-${filename.slice(0, 8)}.pdf"`;

    if (range && info.type === "video/mp4") {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : Math.min(start + 2 * 1024 * 1024 - 1, info.size - 1);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || end >= info.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      const bytes = await readMediaRange(filename, start, end);
      return new Response(bytes, { status: 206, headers: { ...baseHeaders, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(bytes.length) } });
    }

    const media = await readMedia(filename);
    return new Response(media.bytes, { headers: { ...baseHeaders, "Content-Length": String(media.bytes.length) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
