import type { Metadata } from "next";
import { headers } from "next/headers";
import { Roboto } from "next/font/google";
import AnalyticsTracker from "@/app/analytics-tracker";
import { readSiteContent } from "@/lib/content-store";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { origin } = await requestOrigin();
  const content = await readSiteContent().catch(() => null);
  const seo = content?.seo;
  const title = seo?.title || "Tchitundo-Hulo | Standard Bank Angola";
  const description = seo?.description || "Uma plataforma editorial dedicada ao património, à memória e ao futuro de Angola.";
  const canonical = seo?.canonicalUrl?.trim() || origin;
  const socialImage = absoluteUrl(seo?.ogImage || "/og.png", origin);

  return {
    title,
    description,
    keywords: seo?.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    alternates: { canonical },
    robots: seo?.indexable === false ? { index: false, follow: false } : { index: true, follow: true },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_AO",
      url: canonical,
      images: [{ url: socialImage, width: 1536, height: 864, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { origin } = await requestOrigin();
  const content = await readSiteContent().catch(() => null);
  const seo = content?.seo;
  const canonical = seo?.canonicalUrl?.trim() || origin;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seo?.title || "Tchitundo-Hulo | Standard Bank Angola",
    description: seo?.description || "Uma plataforma editorial dedicada ao património cultural angolano.",
    url: canonical,
    inLanguage: "pt-AO",
    isPartOf: { "@type": "WebSite", name: "Tchitundo-Hulo", url: origin },
    publisher: {
      "@type": "Organization",
      name: "Standard Bank Angola",
      logo: { "@type": "ImageObject", url: `${origin}/android-chrome-192x192.png` },
    },
  };

  return (
    <html lang="pt-AO">
      <body className={roboto.variable}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  );
}

async function requestOrigin() {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return { origin: `${protocol}://${host}` };
}

function absoluteUrl(value: string, origin: string) {
  try {
    return new URL(value, origin).toString();
  } catch {
    return `${origin}/og.png`;
  }
}
