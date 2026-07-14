"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { SiteContent } from "@/content/site-content";

export default function SiteHome({ initialContent, preview = false }: { initialContent: SiteContent; preview?: boolean }) {
  const content = initialContent;
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filmOpen, setFilmOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { gallery, agenda, documents, archive, portals, editorial, video, legal } = content;
  const selectedImage = selectedIndex === null ? null : gallery[selectedIndex];

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

  const closeMenu = () => setMenuOpen(false);
  const moveGallery = (direction: -1 | 1) => {
    if (!gallery.length) return;
    setSelectedIndex((current) => current === null ? null : (current + direction + gallery.length) % gallery.length);
  };

  return (
    <main>
      {preview && <div className="preview-banner">Pré-visualização do rascunho <a href="/admin">Voltar ao backoffice</a></div>}
      <a className="skip-link" href="#conteudo">Saltar para o conteúdo</a>
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden="true" />

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div
          className="hero-photo"
          style={{ "--hero-image": `url("${editorial.hero.backgroundImage}")` } as CSSProperties}
          aria-hidden="true"
        />
        <div className="hero-grain" aria-hidden="true" />
        <header className="site-header shell">
          <a className="brand" href="#inicio" aria-label="Standard Bank, início"><ManagedImage src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" width={1717} height={456} sizes="(max-width: 760px) 154px, 190px" priority /></a>
          <nav className="desktop-nav" aria-label="Navegação principal">
            <a href="#cultura">Agenda cultural</a><a href="#campanha">A campanha</a><a href="#territorio">O lugar</a><a href="#galeria">Galeria</a><a href="#impacto">Preservar</a>
          </nav>
          <button className="menu-button" type="button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span /><span /></button>
        </header>

        <div className="hero-content shell" id="conteudo">
          <DottedEyebrow value={editorial.hero.eyebrow} />
          <h1 id="hero-title" className="hero-title-art"><span className="sr-only">Tchitundo-Hulo</span><ManagedImage src={editorial.hero.titleImage} alt="" aria-hidden="true" width={1676} height={840} sizes="(max-width: 760px) calc(100vw - 34px), 49vw" priority /></h1>
          <div className="incision-rule" aria-hidden="true"><span>||||</span></div>
          <p className="hero-lead">{editorial.hero.lead}</p>
          <a className="text-link hero-cta" href="#campanha">{editorial.hero.ctaLabel} <span aria-hidden="true">→</span></a>
        </div>

        <a className="scroll-cue" href="#campanha" aria-label="Descer para a campanha"><span aria-hidden="true">⌄</span></a>
        <div className="hero-portals" aria-label="Entradas principais">
          {portals.map((portal) => <a href={portal.href} key={portal.id}><span className={`portal-mark portal-mark-${portal.mark}`} aria-hidden="true" /><strong>{portal.label}</strong><i aria-hidden="true">→</i></a>)}
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

      <section className="manifesto" id="impacto" aria-label="Manifesto de preservação">
        <div
          className="manifesto-image"
          style={{ "--impact-image": `url("${editorial.impact.backgroundImage}")` } as CSSProperties}
          aria-hidden="true"
        />
        <div className="shell manifesto-content"><p className="eyebrow">{editorial.impact.eyebrow}</p><blockquote>“{editorial.impact.quote}”</blockquote><p>{editorial.impact.attribution}</p></div>
      </section>

      <section className="gallery-section section-dark" id="galeria" aria-labelledby="gallery-title">
        <div className="shell gallery-heading"><div><p className="eyebrow">{editorial.gallery.eyebrow}</p><h2 id="gallery-title"><Lines value={editorial.gallery.title} /></h2></div><p>{editorial.gallery.description}</p></div>
        <div className="gallery-grid shell" onContextMenu={(event) => event.preventDefault()}>
          {gallery.map((image, index) => <button className={`gallery-item ${image.orientation}`} type="button" key={image.id} onClick={() => setSelectedIndex(index)} aria-label={`Ampliar imagem: ${image.label}`}><ManagedImage src={image.src} alt={image.alt} width={1600} height={1200} sizes="(max-width: 440px) calc(100vw - 60px), (max-width: 760px) 50vw, 33vw" draggable={false} loading={index > 1 ? "lazy" : "eager"} /><span><i>{String(index + 1).padStart(2, "0")}</i>{image.label}<b>＋</b></span></button>)}
        </div>
        <p className="gallery-notice shell">{editorial.gallery.notice}</p>
      </section>

      <section className="film" id="filme" aria-labelledby="film-title">
        <div
          className="film-photo"
          style={{ "--film-image": `url("${video.poster}")` } as CSSProperties}
          aria-hidden="true"
        />
        <div className="shell film-content"><p className="eyebrow">{video.eyebrow}</p><h2 id="film-title"><Lines value={video.title} /></h2><p>{video.description}</p><button className="play-button" type="button" onClick={() => setFilmOpen(true)}><span aria-hidden="true">▶</span> {video.buttonLabel}</button></div>
        <div className="film-meta"><span>{video.type}</span><span>{video.enabled && video.src ? "Disponível" : video.status}</span><span>{video.language}</span></div>
      </section>

      <section className="culture" id="cultura" aria-labelledby="culture-title">
        <div className="shell culture-layout">
          <div className="culture-intro"><div><p className="eyebrow dark">{editorial.culture.eyebrow}</p><h2 id="culture-title"><Lines value={editorial.culture.title} /></h2></div><div className="culture-intro-copy"><p>{editorial.culture.description}</p><span className="agenda-status">{editorial.culture.status}</span></div></div>
          <div className="agenda-list">{agenda.map((item, index) => <article className={index === 0 ? "agenda-featured" : ""} key={item.id}><div className="agenda-media"><ManagedImage src={item.image} alt="" fill sizes="(max-width: 760px) calc(100vw - 34px), 50vw" /></div><div className="agenda-card-content"><div className="agenda-card-meta"><span>{item.number}</span><p>{item.type}</p></div><h3>{item.title}</h3><small>{item.detail}</small><div className="agenda-card-footer"><strong>{item.status}</strong><i aria-hidden="true">↗</i></div></div></article>)}</div>
        </div>
      </section>

      <section className="documents section-dark" id="documentos" aria-labelledby="documents-title">
        <div className="shell documents-layout"><div><p className="eyebrow">{editorial.documents.eyebrow}</p><h2 id="documents-title"><Lines value={editorial.documents.title} /></h2></div><div className="document-list">{documents.map((item) => item.available && item.href ? <a href={item.href} download key={item.id}><span>PDF</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><i aria-hidden="true">↓</i></a> : <div className="document-coming" key={item.id}><span>PDF</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><i aria-hidden="true">Breve</i></div>)}</div></div>
      </section>

      <section className="archive" id="arquivo" aria-labelledby="archive-title">
        <div className="shell archive-heading"><div><p className="eyebrow dark">{editorial.archive.eyebrow}</p><h2 id="archive-title"><Lines value={editorial.archive.title} /></h2></div><p>{editorial.archive.description}</p></div>
        <div className="archive-grid shell">{archive.map((item) => <article className={item.active ? "active" : ""} key={item.id}><span>{item.year}</span><div><small>{item.tag}</small><h3>{item.title}</h3></div><i aria-hidden="true">{item.active ? "→" : "+"}</i></article>)}</div>
      </section>

      <section className="closing" aria-labelledby="closing-title">
        <div
          className="closing-photo"
          style={{ "--closing-image": `url("${editorial.closing.backgroundImage}")` } as CSSProperties}
          aria-hidden="true"
        />
        <div className="shell closing-content"><p className="eyebrow">{editorial.closing.eyebrow}</p><h2 id="closing-title"><Lines value={editorial.closing.title} /></h2><p>{editorial.closing.description}</p><a className="text-link" href="#inicio">Voltar ao início <span aria-hidden="true">↑</span></a></div>
      </section>

      <footer className="site-footer">
        <div className="shell footer-top"><ManagedImage src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" width={1717} height={456} sizes="245px" /><nav aria-label="Navegação do rodapé"><a href="#campanha">Campanha</a><a href="#territorio">Tchitundo-Hulo</a><a href="#galeria">Galeria</a><a href="#cultura">Cultura</a><a href="#documentos">Documentos</a></nav></div>
        <div className="shell footer-bottom"><span>{legal.copyright}</span><span className="footer-legal">{legal.privacyUrl && <a href={legal.privacyUrl}>{legal.privacyLabel}</a>}{legal.termsUrl && <a href={legal.termsUrl}>{legal.termsLabel}</a>}</span><span>{legal.strapline}</span></div>
      </footer>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}><div className="mobile-menu-inner"><p>Explorar</p><a href="#campanha" onClick={closeMenu}>A campanha <span>01</span></a><a href="#territorio" onClick={closeMenu}>O lugar <span>02</span></a><a href="#galeria" onClick={closeMenu}>Galeria <span>03</span></a><a href="#cultura" onClick={closeMenu}>Cultura e agenda <span>04</span></a><a href="#arquivo" onClick={closeMenu}>Arquivo <span>05</span></a></div></div>

      {selectedImage && <div className="lightbox" role="dialog" aria-modal="true" aria-label={selectedImage.label} onClick={() => setSelectedIndex(null)}><button className="lightbox-close" type="button" onClick={() => setSelectedIndex(null)} aria-label="Fechar imagem">×</button><button className="gallery-nav gallery-nav-prev" type="button" onClick={(event) => { event.stopPropagation(); moveGallery(-1); }} aria-label="Imagem anterior">←</button><figure onClick={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}><ManagedImage src={selectedImage.src} alt={selectedImage.alt} width={2048} height={1434} sizes="(max-width: 760px) calc(100vw - 36px), 80vw" draggable={false} /><figcaption><span>{selectedImage.label}</span><b>{String((selectedIndex ?? 0) + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}</b></figcaption></figure><button className="gallery-nav gallery-nav-next" type="button" onClick={(event) => { event.stopPropagation(); moveGallery(1); }} aria-label="Imagem seguinte">→</button></div>}

      {filmOpen && <div className="film-modal" role="dialog" aria-modal="true" aria-label={video.enabled && video.src ? video.title : undefined} aria-labelledby={video.enabled && video.src ? undefined : "film-modal-title"} onClick={() => setFilmOpen(false)}><div className={video.enabled && video.src ? "film-player-modal" : ""} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setFilmOpen(false)} aria-label="Fechar">×</button>{video.enabled && video.src ? <video controls autoPlay playsInline poster={video.poster} src={video.src}>O seu navegador não suporta vídeo HTML5.</video> : <><span className="film-icon" aria-hidden="true">▶</span><p className="eyebrow">{video.type}</p><h3 id="film-modal-title">O filme está em preparação.</h3><p>Este módulo está pronto para receber o documentário e os conteúdos audiovisuais oficiais da campanha.</p></>}</div></div>}
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

function ManagedImage({ src, alt, unoptimized, ...props }: ImageProps) {
  if (typeof src === "string" && !src.trim()) return null;
  const bypassOptimizer = typeof src === "string" && (/^(?:https?:|data:|blob:)/i.test(src) || src.startsWith("/api/"));
  return <Image src={src} alt={alt} unoptimized={unoptimized ?? bypassOptimizer} {...props} />;
}
