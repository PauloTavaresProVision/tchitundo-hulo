import { readSiteContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const content = await readSiteContent().catch(() => null);
  const origin = (content?.seo.canonicalUrl?.trim() || new URL(request.url).origin).replace(/\/$/, "");
  const englishOrigin = (content?.translations.en.seo.canonicalUrl?.trim() || `${origin}/en`).replace(/\/$/, "");
  const newsUrls = content?.settings.newsEnabled
    ? content.news.filter((item) => item.published).map((item) => `  <url><loc>${escapeXml(origin)}/noticias/${escapeXml(item.slug)}</loc><lastmod>${escapeXml(item.publishedAt)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join("\n")
    : "";
  const englishNewsUrls = content?.settings.newsEnabled && content.settings.languageSwitcherEnabled
    ? content.translations.en.news.filter((item) => item.published).map((item) => `  <url><loc>${escapeXml(englishOrigin)}/news/${escapeXml(item.slug)}</loc><lastmod>${escapeXml(item.publishedAt)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join("\n")
    : "";
  const englishHome = content?.settings.languageSwitcherEnabled
    ? `  <url><loc>${escapeXml(englishOrigin)}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`
    : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeXml(origin)}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
${newsUrls}
${englishHome}
${englishNewsUrls}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
