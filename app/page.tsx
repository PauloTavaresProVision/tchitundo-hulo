import SiteHome from "@/app/site-home";
import { readSiteContent } from "@/lib/content-store";
import { resolveSiteContent } from "@/lib/site-locale";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <SiteHome initialContent={resolveSiteContent(await readSiteContent(), "pt")} locale="pt" />;
}
