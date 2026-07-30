import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readSiteContent } from "@/lib/content-store";
import { optimizedMediaUrl } from "@/lib/optimized-media";
import { publicNewsPath, resolveSiteContent } from "@/lib/site-locale";

export const dynamic = "force-dynamic";

type NewsPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = resolveSiteContent(await readSiteContent(), "pt");
  const item = content.news.find((candidate) => candidate.slug === slug && candidate.published);
  if (!item) return { title: "Notícia não encontrada" };
  return {
    title: `${item.title} | Standard Bank Angola`,
    description: item.summary,
    openGraph: {
      title: item.title,
      description: item.summary,
      type: "article",
      publishedTime: item.publishedAt,
      images: [{ url: item.image, alt: item.imageAlt }],
    },
  };
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { slug } = await params;
  const source = await readSiteContent();
  const content = resolveSiteContent(source, "pt");
  const item = content.news.find((candidate) => candidate.slug === slug && candidate.published);
  if (!content.settings.newsEnabled || !item) notFound();
  const englishItem = source.translations.en.news.find((candidate) => candidate.id === item.id && candidate.published);
  const imageSrc = optimizedMediaUrl(item.image);
  const bypassOptimizer = /^(?:https?:|data:|blob:)/i.test(imageSrc) || imageSrc.startsWith("/api/");

  return <main className="news-article-page">
    <header className="news-article-header shell">
      <Link href="/" aria-label="Standard Bank, início"><Image src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" width={1717} height={456} priority /></Link>
      <div className="news-article-actions"><Link href="/#noticias">← Voltar às notícias</Link>{source.settings.languageSwitcherEnabled && <nav className="language-switcher" aria-label="Selecionar idioma"><Link className="active" href={publicNewsPath("pt", item.slug)}>PT</Link><span>/</span><Link href={englishItem ? publicNewsPath("en", englishItem.slug) : "/en"}>EN</Link></nav>}</div>
    </header>
    <article>
      <div className="news-article-intro shell">
        <div><span>{item.category}</span><time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time></div>
        <h1>{item.title}</h1>
        <p>{item.summary}</p>
      </div>
      <figure className="news-article-hero shell">
        <Image src={imageSrc} alt={item.imageAlt} fill sizes="(max-width: 760px) calc(100vw - 34px), 1440px" priority unoptimized={bypassOptimizer} />
      </figure>
      <div className="news-article-body shell">
        {item.body.split(/\n{2,}/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
      </div>
    </article>
    <footer className="news-article-footer"><div className="shell"><span>Standard Bank Angola</span><Link href="/">Tchitundu-Hulu · Os nossos valores de sempre</Link></div></footer>
  </main>;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
