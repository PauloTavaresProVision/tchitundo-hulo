import { headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHome from "@/app/site-home";
import type { SiteLocale } from "@/content/site-content";
import { readAdminSession } from "@/lib/admin-auth";
import { readDraftSiteContent } from "@/lib/content-store";
import { resolveSiteContent } from "@/lib/site-locale";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const incoming = await headers();
  const request = new Request("http://localhost/preview", { headers: incoming });
  if (!await readAdminSession(request)) redirect("/admin");
  const { lang } = await searchParams;
  const locale: SiteLocale = lang === "en" ? "en" : "pt";
  return <SiteHome initialContent={resolveSiteContent(await readDraftSiteContent(), locale)} locale={locale} preview />;
}
