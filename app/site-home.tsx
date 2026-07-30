"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import CookieConsent from "@/app/cookie-consent";
import type { ResolvedSiteContent, SiteLocale } from "@/content/site-content";
import { openCookieSettings } from "@/lib/cookie-consent";
import { galleryThumbnailUrl, optimizedMediaUrl } from "@/lib/optimized-media";
import { publicNewsPath } from "@/lib/site-locale";

export default function SiteHome({ initialContent, locale, preview = false }: { initialContent: ResolvedSiteContent; locale: SiteLocale; preview?: boolean }) {
  const content = initialContent;
  const ui = interfaceCopy[locale];
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filmOpen, setFilmOpen] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { gallery, news, agenda, documents, archive, portals, editorial, video, legal, settings } = content;
  const visiblePortals = portals.filter((portal) => settings.agendaEnabled || portal.href !== "#cultura");
  const publishedNews = news.filter((item) => item.published);
  const youtubeEmbed = youtubeEmbedUrl(video.src);
  const selectedImage = selectedIndex === null ? null : gallery[selectedIndex];

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "pt-AO";
  }, [locale]);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? window.scrollY / total : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const isOpen = selectedIndex !== null || filmOpen || menuOpen;
    document.body.style.overflow = isOpen ? "hidden" : "";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIndex(null);
        setFilmOpen(false);
        setMenuOpen(false);
      }
      if (event.key === "ArrowLeft" && gallery.length) setSelectedIndex((current) => current === null ? null : (current - 1 + gallery.length) % gallery.length);
      if (event.key === "ArrowRight" && gallery.length) setSelectedIndex((current) => current === null ? null : (current + 1) % gallery.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedIndex, filmOpen, menuOpen, gallery.length]);

  useEffect(() => {
    if (!heroReady) return;
    const thumbnailUrls = [...new Set(gallery.map((image) => galleryThumbnailUrl(image.src)))];
    const preloaders: HTMLImageElement[] = [];
    const timer = window.setTimeout(() => {
      thumbnailUrls.forEach((url) => {
        const preload = new window.Image();
        preload.decoding = "async";
        preload.src = url;
        preloaders.push(preload);
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [gallery, heroReady]);

  const closeMenu = () => setMenuOpen(false);
  const moveGallery = (direction: -1 | 1) => {
    if (!gallery.length) return;
    setSelectedIndex((current) => current === null ? null : (current + direction + gallery.length) % gallery.length);
  };

  return (
    <main lang={locale === "en" ? "en" : "pt-AO"}>
      {preview && <div className="preview-banner">{ui.preview} <a href="/admin">{ui.backoffice}</a></div>}
      <a className="skip-link" href="#conteudo">{ui.skipContent}</a>
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden="true" />

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div className="hero-photo" aria-hidden="true"><ManagedImage src={editorial.hero.backgroundImage} alt="" fill sizes="100vw" priority onLoad={() => setHeroReady(true)} /></div>
        <div className="hero-grain" aria-hidden="true" />
        <header className="site-header shell">
          <a className="brand" href="#inicio" aria-label={`Standard Bank, ${ui.home}`}><ManagedImage src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" width={1717} height={456} sizes="(max-width: 760px) 154px, 190px" priority /></a>
          <nav className="desktop-nav" aria-label={ui.primaryNavigation}>
            {settings.agendaEnabled && <a href="#cultura">{ui.nav.agenda}</a>}<a href="#campanha">{ui.nav.campaign}</a><a href="#territorio">{ui.nav.place}</a><a href="#galeria">{ui.nav.gallery}</a><a href="#impacto">{ui.nav.preserve}</a>{settings.newsEnabled && <a href="#noticias">{ui.nav.news}</a>}
          </nav>
          <div className="header-controls">
            {settings.languageSwitcherEnabled && <nav className="language-switcher" aria-label={ui.languageSelection}><a className={locale === "pt" ? "active" : ""} href="/">PT</a><span>/</span><a className={locale === "en" ? "active" : ""} href="/en">EN</a></nav>}
            <button className="menu-button" type="button" aria-label={menuOpen ? ui.closeMenu : ui.openMenu} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span /><span /></button>
          </div>
        </header>

        <div className="hero-content shell" id="conteudo">
          <DottedEyebrow value={editorial.hero.eyebrow} />
          <h1 id="hero-title" className="hero-title-art"><span className="sr-only">Tchitundu-Hulu</span><ManagedImage src={editorial.hero.titleImage} alt="" aria-hidden="true" width={1676} height={840} sizes="(max-width: 760px) calc(100vw - 34px), 49vw" priority /></h1>
          <div className="incision-rule" aria-hidden="true"><span>||||</span></div>
          <p className="hero-lead">{editorial.hero.lead}</p>
          <a className="text-link hero-cta" href="#campanha">{editorial.hero.ctaLabel} <span aria-hidden="true">→</span></a>
        </div>

        <a className="scroll-cue" href="#campanha" aria-label={ui.scrollToCampaign}><span aria-hidden="true">⌄</span></a>
        <div className={`hero-portals portal-count-${visiblePortals.length}`} aria-label={ui.mainEntries}>
          {visiblePortals.map((portal) => <a href={portal.href} key={portal.id}><span className={`portal-mark portal-mark-${portal.mark}`} aria-hidden="true" /><strong>{portal.label}</strong><i aria-hidden="true">→</i></a>)}
        </div>
      </section>

      <section className="campaign section-dark" id="campanha" aria-labelledby="campaign-title">
        <div className="shell section-grid">
          <div className="section-index" aria-hidden="true">01 / 08</div>
          <div className="campaign-copy">
            <p className="eyebrow">{editorial.campaign.eyebrow}</p>
            <h2 id="campaign-title"><Lines value={editorial.campaign.title} /></h2>
            <p className="large-copy">{editorial.campaign.intro}</p>
            <p>{editorial.campaign.body}</p>
            <a className="text-link" href="#territorio">{editorial.campaign.ctaLabel} <span aria-hidden="true">→</span></a>
          </div>
          <figure className="campaign-visual">
            <ManagedImage src={editorial.campaign.image} alt={editorial.campaign.imageAlt} fill sizes="(max-width: 760px) calc(100vw - 34px), (max-width: 1100px) calc(100vw - 100px), 50vw" />
            <figcaption><span>15°37&apos; S</span><span>12°48&apos; E</span><strong>{editorial.campaign.location}</strong></figcaption>
          </figure>
        </div>
      </section>

      <section className="territory" id="territorio" aria-labelledby="territory-title">
        <div className="shell territory-heading">
          <div><p className="eyebrow dark">{editorial.territory.eyebrow}</p><h2 id="territory-title"><Lines value={editorial.territory.title} /></h2></div>
          <p>{editorial.territory.intro}</p>
        </div>
        <div className="territory-stage shell">
          <div className="territory-image">
            <ManagedImage src={editorial.territory.image} alt={editorial.territory.imageAlt} fill sizes="(max-width: 760px) calc(100vw - 34px), (max-width: 1100px) calc(100vw - 100px), 65vw" />
            <span className="image-marker marker-one">{editorial.territory.markerOne}</span><span className="image-marker marker-two">{editorial.territory.markerTwo}</span>
          </div>
          <div className="territory-notes">
            <article><span>01</span><h3>{editorial.territory.noteOneTitle}</h3><p>{editorial.territory.noteOneBody}</p></article>
            <article><span>02</span><h3>{editorial.territory.noteTwoTitle}</h3><p>{editorial.territory.noteTwoBody}</p></article>
          </div>
        </div>
      </section>

      <section className="manifesto" id="impacto" aria-label={ui.preservationManifesto}>
        <div className="manifesto-image" aria-hidden="true"><ManagedImage src={editorial.impact.backgroundImage} alt="" fill sizes="100vw" /></div>
        <div className="shell manifesto-content"><p className="eyebrow">{editorial.impact.eyebrow}</p><blockquote>“{editorial.impact.quote}”</blockquote><p>{editorial.impact.attribution}</p></div>
      </section>

      {settings.newsEnabled && <section className="news-section" id="noticias" aria-labelledby="news-title">
        <div className="shell news-heading">
          <div><p className="eyebrow dark">{editorial.news.eyebrow}</p><h2 id="news-title"><Lines value={editorial.news.title} /></h2></div>
          <p>{editorial.news.description}</p>
        </div>
        {publishedNews.length ? <div className="news-grid shell">{publishedNews.map((item) => <article key={item.id}>
          <a className="news-image" href={publicNewsPath(locale, item.slug)} aria-label={`${ui.readNews}: ${item.title}`}><ManagedImage src={item.image} alt={item.imageAlt} fill sizes="(max-width: 760px) calc(100vw - 34px), 33vw" /></a>
          <div className="news-card-copy"><div><span>{item.category}</span><time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt, locale)}</time></div><h3><a href={publicNewsPath(locale, item.slug)}>{item.title}</a></h3><p>{item.summary}</p><a className="text-link news-link" href={publicNewsPath(locale, item.slug)}>{ui.readNews} <span aria-hidden="true">→</span></a></div>
        </article>)}</div> : <p className="news-empty shell">{ui.newsSoon}</p>}
      </section>}

      <section className="gallery-section section-dark" id="galeria" aria-labelledby="gallery-title">
        <div className="shell gallery-heading"><div><p className="eyebrow">{editorial.gallery.eyebrow}</p><h2 id="gallery-title"><Lines value={editorial.gallery.title} /></h2></div><p>{editorial.gallery.description}</p></div>
        <div className="gallery-grid shell">
          {gallery.map((image, index) => <button className={`gallery-item ${image.orientation}`} type="button" key={image.id} onClick={() => setSelectedIndex(index)} aria-label={`${ui.enlargeImage}: ${image.label}`}><ManagedImage src={galleryThumbnailUrl(image.src)} alt={image.alt} width={1200} height={900} sizes="(max-width: 440px) calc(100vw - 60px), (max-width: 760px) 50vw, 33vw" draggable={false} loading="lazy" unoptimized /><span><i>{String(index + 1).padStart(2, "0")}</i>{image.label}<b>＋</b></span></button>)}
        </div>
        <p className="gallery-notice shell">{editorial.gallery.notice}</p>
      </section>

      <section className="film" id="filme" aria-labelledby="film-title">
        <div className="film-photo" aria-hidden="true"><ManagedImage src={video.poster} alt="" fill sizes="100vw" /></div>
        <div className="shell film-content"><p className="eyebrow">{video.eyebrow}</p><h2 id="film-title"><Lines value={video.title} /></h2><p>{video.description}</p><button className="play-button" type="button" onClick={() => setFilmOpen(true)}><span aria-hidden="true">▶</span> {video.buttonLabel}</button></div>
        <div className="film-meta"><span>{video.type}</span><span>{video.enabled && video.src ? ui.available : video.status}</span><span>{video.language}</span></div>
      </section>

      {settings.agendaEnabled && <section className="culture" id="cultura" aria-labelledby="culture-title">
        <div className="shell culture-layout">
          <div className="culture-intro"><div><p className="eyebrow dark">{editorial.culture.eyebrow}</p><h2 id="culture-title"><Lines value={editorial.culture.title} /></h2></div><div className="culture-intro-copy"><p>{editorial.culture.description}</p><span className="agenda-status">{editorial.culture.status}</span></div></div>
          <div className="agenda-list">{agenda.map((item, index) => <article className={index === 0 ? "agenda-featured" : ""} key={item.id}><div className="agenda-media"><ManagedImage src={item.image} alt="" fill sizes="(max-width: 760px) calc(100vw - 34px), 50vw" /></div><div className="agenda-card-content"><div className="agenda-card-meta"><span>{item.number}</span><p>{item.type}</p></div><h3>{item.title}</h3><small>{item.detail}</small><div className="agenda-card-footer"><strong>{item.status}</strong><i aria-hidden="true">↗</i></div></div></article>)}</div>
        </div>
      </section>}

      <section className="documents section-dark" id="documentos" aria-labelledby="documents-title">
        <div className="shell documents-layout"><div><p className="eyebrow">{editorial.documents.eyebrow}</p><h2 id="documents-title"><Lines value={editorial.documents.title} /></h2></div><div className="document-list">{documents.map((item) => item.available && item.href ? <a href={item.href} download key={item.id}><span>PDF</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><i aria-hidden="true">↓</i></a> : <div className="document-coming" key={item.id}><span>PDF</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><i aria-hidden="true">{ui.comingSoon}</i></div>)}</div></div>
      </section>

      <section className="archive" id="arquivo" aria-labelledby="archive-title">
        <div className="shell archive-heading"><div><p className="eyebrow dark">{editorial.archive.eyebrow}</p><h2 id="archive-title"><Lines value={editorial.archive.title} /></h2></div><p>{editorial.archive.description}</p></div>
        <div className="archive-grid shell">{archive.map((item) => <article className={item.active ? "active" : ""} key={item.id}><span>{item.year}</span><div><small>{item.tag}</small><h3>{item.title}</h3></div><i aria-hidden="true">{item.active ? "→" : "+"}</i></article>)}</div>
      </section>

      <section className="closing" aria-labelledby="closing-title">
        <div className="closing-photo" aria-hidden="true"><ManagedImage src={editorial.closing.backgroundImage} alt="" fill sizes="100vw" /></div>
        <div className="shell closing-content"><p className="eyebrow">{editorial.closing.eyebrow}</p><h2 id="closing-title"><Lines value={editorial.closing.title} /></h2><p>{editorial.closing.description}</p><a className="text-link" href="#inicio">{ui.backToTop} <span aria-hidden="true">↑</span></a></div>
      </section>

      <footer className="site-footer">
        <div className="shell footer-top"><ManagedImage src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" width={1717} height={456} sizes="245px" /><nav aria-label={ui.footerNavigation}><a href="#campanha">{ui.nav.campaign}</a><a href="#territorio">Tchitundu-Hulu</a><a href="#galeria">{ui.nav.gallery}</a>{settings.newsEnabled && <a href="#noticias">{ui.nav.news}</a>}{settings.agendaEnabled && <a href="#cultura">{ui.nav.culture}</a>}<a href="#documentos">{ui.nav.documents}</a></nav></div>
        <div className="footer-corporate shell"><CorporateNotice value={legal.corporateNotice} /></div>
        <div className="shell footer-bottom"><span>{legal.copyright}</span><span className="footer-legal">{legal.privacyUrl && <a href={legal.privacyUrl}>{legal.privacyLabel}</a>}{legal.termsUrl && <a href={legal.termsUrl}>{legal.termsLabel}</a>}<a href={legal.cookiesUrl} target="_blank" rel="noreferrer">{ui.cookiePolicy}</a><button type="button" onClick={openCookieSettings}>{legal.cookiesLabel}</button></span><span>{legal.strapline}</span></div>
      </footer>

      <CookieConsent policyUrl={legal.cookiesUrl} locale={locale} />

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}><div className="mobile-menu-inner"><p>{ui.explore}</p><a href="#campanha" onClick={closeMenu}>{ui.nav.campaign} <span>01</span></a><a href="#territorio" onClick={closeMenu}>{ui.nav.place} <span>02</span></a><a href="#galeria" onClick={closeMenu}>{ui.nav.gallery} <span>03</span></a>{settings.newsEnabled && <a href="#noticias" onClick={closeMenu}>{ui.nav.news} <span>04</span></a>}{settings.agendaEnabled && <a href="#cultura" onClick={closeMenu}>{ui.nav.cultureAgenda} <span>05</span></a>}<a href="#arquivo" onClick={closeMenu}>{ui.nav.archive} <span>06</span></a></div></div>

      {selectedImage && <div className="lightbox" role="dialog" aria-modal="true" aria-label={selectedImage.label} onClick={() => setSelectedIndex(null)}><button className="lightbox-close" type="button" onClick={() => setSelectedIndex(null)} aria-label={ui.closeImage}>×</button><button className="gallery-nav gallery-nav-prev" type="button" onClick={(event) => { event.stopPropagation(); moveGallery(-1); }} aria-label={ui.previousImage}>←</button><figure onClick={(event) => event.stopPropagation()}><ManagedImage src={selectedImage.src} alt={selectedImage.alt} width={2048} height={1434} sizes="(max-width: 760px) calc(100vw - 36px), 80vw" unoptimized /><figcaption><span>{selectedImage.label}</span><a className="gallery-download" href={selectedImage.src} download={downloadFilename(selectedImage.src, selectedImage.label)}>{ui.download} ↓</a><b>{String((selectedIndex ?? 0) + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}</b></figcaption></figure><button className="gallery-nav gallery-nav-next" type="button" onClick={(event) => { event.stopPropagation(); moveGallery(1); }} aria-label={ui.nextImage}>→</button></div>}

      {filmOpen && <div className="film-modal" role="dialog" aria-modal="true" aria-label={video.enabled && video.src ? video.title : undefined} aria-labelledby={video.enabled && video.src ? undefined : "film-modal-title"} onClick={() => setFilmOpen(false)}><div className={video.enabled && video.src ? "film-player-modal" : ""} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setFilmOpen(false)} aria-label={ui.close}>×</button>{video.enabled && video.src ? youtubeEmbed ? <iframe src={`${youtubeEmbed}?autoplay=1&rel=0`} title={video.title.replace(/\n/g, " ")} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <video controls autoPlay playsInline preload="metadata" poster={optimizedMediaUrl(video.poster)} src={video.src}>{ui.unsupportedVideo}</video> : <><span className="film-icon" aria-hidden="true">▶</span><p className="eyebrow">{video.type}</p><h3 id="film-modal-title">{ui.filmPreparing}</h3><p>{ui.filmPreparingText}</p></>}</div></div>}
    </main>
  );
}

function Lines({ value }: { value: string }) {
  return <>{value.split("\n").map((line, index) => <span key={`${line}-${index}`}>{index > 0 && <br />}{line}</span>)}</>;
}

function DottedEyebrow({ value }: { value: string }) {
  const parts = value.split("·").map((part) => part.trim()).filter(Boolean);
  return <p className="eyebrow">{parts.map((part, index) => <span key={part}>{index > 0 && <i />}{part}</span>)}</p>;
}

function CorporateNotice({ value }: { value: string }) {
  const taxNumber = "5417093386";
  const [before, after] = value.split(taxNumber);
  return <p>{before}{after === undefined ? null : <><span>{taxNumber}</span>{after}</>}</p>;
}

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const id = url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.hostname.endsWith("youtube.com")
        ? url.searchParams.get("v") || url.pathname.match(/^\/embed\/([^/]+)/)?.[1]
        : null;
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

function formatNewsDate(value: string, locale: SiteLocale) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pt-AO", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function downloadFilename(src: string, label: string) {
  const extension = src.split("?")[0]?.match(/\.[a-z0-9]+$/i)?.[0] || ".jpg";
  const base = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tchitundu-hulu";
  return `${base}${extension}`;
}

function ManagedImage({ src, alt, unoptimized, ...props }: ImageProps) {
  if (typeof src === "string" && !src.trim()) return null;
  const resolvedSrc = typeof src === "string" ? optimizedMediaUrl(src) : src;
  const bypassOptimizer = typeof resolvedSrc === "string" && (/^(?:https?:|data:|blob:)/i.test(resolvedSrc) || resolvedSrc.startsWith("/api/"));
  return <Image src={resolvedSrc} alt={alt} unoptimized={unoptimized ?? bypassOptimizer} {...props} />;
}

const interfaceCopy = {
  pt: {
    preview: "Pré-visualização do rascunho",
    backoffice: "Voltar ao backoffice",
    skipContent: "Saltar para o conteúdo",
    home: "início",
    primaryNavigation: "Navegação principal",
    footerNavigation: "Navegação do rodapé",
    languageSelection: "Selecionar idioma",
    closeMenu: "Fechar menu",
    openMenu: "Abrir menu",
    scrollToCampaign: "Descer para a campanha",
    mainEntries: "Entradas principais",
    preservationManifesto: "Manifesto de preservação",
    readNews: "Ler notícia",
    newsSoon: "Novos conteúdos serão publicados em breve.",
    enlargeImage: "Ampliar imagem",
    available: "Disponível",
    comingSoon: "Breve",
    backToTop: "Voltar ao início",
    cookiePolicy: "Política de cookies",
    explore: "Explorar",
    closeImage: "Fechar imagem",
    previousImage: "Imagem anterior",
    nextImage: "Imagem seguinte",
    download: "Descarregar",
    close: "Fechar",
    unsupportedVideo: "O seu navegador não suporta vídeo HTML5.",
    filmPreparing: "O filme está em preparação.",
    filmPreparingText: "Este módulo está pronto para receber o documentário e os conteúdos audiovisuais oficiais da campanha.",
    nav: { agenda: "Agenda cultural", campaign: "A campanha", place: "O lugar", gallery: "Galeria", preserve: "Preservar", news: "Notícias", culture: "Cultura", cultureAgenda: "Cultura e agenda", documents: "Documentos", archive: "Arquivo" },
  },
  en: {
    preview: "Draft preview",
    backoffice: "Return to backoffice",
    skipContent: "Skip to content",
    home: "home",
    primaryNavigation: "Main navigation",
    footerNavigation: "Footer navigation",
    languageSelection: "Select language",
    closeMenu: "Close menu",
    openMenu: "Open menu",
    scrollToCampaign: "Scroll to the campaign",
    mainEntries: "Main sections",
    preservationManifesto: "Preservation manifesto",
    readNews: "Read article",
    newsSoon: "New content will be published soon.",
    enlargeImage: "Enlarge image",
    available: "Available",
    comingSoon: "Coming soon",
    backToTop: "Back to top",
    cookiePolicy: "Cookie policy",
    explore: "Explore",
    closeImage: "Close image",
    previousImage: "Previous image",
    nextImage: "Next image",
    download: "Download",
    close: "Close",
    unsupportedVideo: "Your browser does not support HTML5 video.",
    filmPreparing: "The film is in preparation.",
    filmPreparingText: "This module is ready to receive the official documentary and audiovisual content from the campaign.",
    nav: { agenda: "Cultural agenda", campaign: "The campaign", place: "The place", gallery: "Gallery", preserve: "Preserve", news: "News", culture: "Culture", cultureAgenda: "Culture and events", documents: "Documents", archive: "Archive" },
  },
} as const;
