import { headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHome from "@/app/site-home";
import { readAdminSession } from "@/lib/admin-auth";
import { readDraftSiteContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage() {
  const incoming = await headers();
  const request = new Request("http://localhost/preview", { headers: incoming });
  if (!await readAdminSession(request)) redirect("/admin");
  return <SiteHome initialContent={await readDraftSiteContent()} preview />;
}
