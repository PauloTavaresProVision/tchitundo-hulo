import type { Metadata } from "next";
import { headers } from "next/headers";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Tchitundo-Hulo | Standard Bank Angola",
    description: "Uma plataforma editorial dedicada ao património, à memória e ao futuro de Angola.",
    icons: {
      icon: "/brand/standard-bank-logo-white-official.png",
      shortcut: "/brand/standard-bank-logo-white-official.png",
    },
    openGraph: {
      title: "Tchitundo-Hulo — Marcas na pedra. Memória viva.",
      description: "Uma iniciativa do Standard Bank de Angola para valorizar o património cultural angolano.",
      type: "website",
      locale: "pt_AO",
      url: origin,
      images: [{ url: `${origin}/og.png`, width: 1536, height: 864, alt: "Tchitundo-Hulo — Marcas na pedra. Memória viva." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Tchitundo-Hulo | Standard Bank Angola",
      description: "Marcas na pedra. Memória viva.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-AO">
      <body className={roboto.variable}>{children}</body>
    </html>
  );
}
