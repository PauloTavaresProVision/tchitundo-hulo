import { readSiteContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const content = await readSiteContent().catch(() => null);
  const origin = content?.seo.canonicalUrl?.trim() || new URL(request.url).origin;
  const rules = content?.seo.indexable === false
    ? ["User-agent: *", "Disallow: /"]
    : ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /preview", "Disallow: /api"];
  return new Response([...rules, `Sitemap: ${origin.replace(/\/$/, "")}/sitemap.xml`, ""].join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
