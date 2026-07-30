import type { Metadata } from "next";
import { headers } from "next/headers";
import SiteHome from "@/app/site-home";
import { readSiteContent } from "@/lib/content-store";
import { resolveSiteContent } from "@/lib/site-locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await readSiteContent();
  const english = content.translations.en.seo;
  const origin = await requestOrigin();
  const portugueseCanonical = content.seo.canonicalUrl.trim() || origin;
  const canonical = english.canonicalUrl.trim() || `${portugueseCanonical.replace(/\/$/, "")}/en`;
  const socialImage = new URL(english.ogImage, origin).toString();
  return {
    title: english.title,
    description: english.description,
    keywords: english.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    alternates: {
      canonical,
      languages: {
        "pt-AO": portugueseCanonical,
        en: canonical,
      },
    },
    robots: english.indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: english.title,
      description: english.description,
      type: "website",
      locale: "en",
      url: canonical,
      images: [{ url: socialImage, width: 1536, height: 864, alt: english.title }],
    },
    twitter: { card: "summary_large_image", title: english.title, description: english.description, images: [socialImage] },
  };
}

export default async function EnglishHome() {
  return <SiteHome initialContent={resolveSiteContent(await readSiteContent(), "en")} locale="en" />;
}

async function requestOrigin() {
  const incoming = await headers();
  const trustProxy = process.env.TRUST_PROXY_HEADERS === "true";
  const host = firstHeaderValue(trustProxy ? incoming.get("x-forwarded-host") : null)
    || firstHeaderValue(incoming.get("host"))
    || "localhost:3000";
  const forwardedProtocol = trustProxy ? firstHeaderValue(incoming.get("x-forwarded-proto")) : "";
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() ?? "";
}
