import { readSiteContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const content = await readSiteContent().catch(() => null);
  const origin = (content?.seo.canonicalUrl?.trim() || new URL(request.url).origin).replace(/\/$/, "");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeXml(origin)}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
