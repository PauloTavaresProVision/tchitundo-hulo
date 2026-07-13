import SiteHome from "@/app/site-home";
import { readSiteContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <SiteHome initialContent={await readSiteContent()} />;
}
