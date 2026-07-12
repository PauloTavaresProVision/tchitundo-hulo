"use client";

import { useEffect, useState } from "react";
import { siteContent, type SiteContent } from "@/content/site-content";

export default function Home() {
  const [content, setContent] = useState<SiteContent>(siteContent);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filmOpen, setFilmOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { gallery, agenda, documents, archive, portals } = content;
  const selectedImage = selectedIndex === null ? null : gallery[selectedIndex];

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Content unavailable")))
      .then((nextContent: SiteContent) => setContent(nextContent))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

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
      if (event.key === "ArrowLeft") {
        setSelectedIndex((current) => current === null ? null : (current - 1 + gallery.length) % gallery.length);
      }
      if (event.key === "ArrowRight") {
        setSelectedIndex((current) => current === null ? null : (current + 1) % gallery.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedIndex, filmOpen, menuOpen, gallery.length]);

  const closeMenu = () => setMenuOpen(false);
  const moveGallery = (direction: -1 | 1) => {
    setSelectedIndex((current) => current === null ? null : (current + direction + gallery.length) % gallery.length);
  };

  return (
    <main>
      <a className="skip-link" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden="true" />

      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-grain" aria-hidden="true" />
        <header className="site-header shell">
          <a className="brand" href="#inicio" aria-label="Standard Bank, início">
            <img src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" />
          </a>
          <nav className="desktop-nav" aria-label="Navegação principal">
            <a href="#cultura">Agenda cultural</a>
            <a href="#campanha">A campanha</a>
            <a href="#territorio">O lugar</a>
            <a href="#galeria">Galeria</a>
            <a href="#impacto">Preservar</a>
          </nav>
          <button
            className="menu-button"
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </header>

        <div className="hero-content shell" id="conteudo">
          <p className="eyebrow">Património <i /> Angola <i /> Futuro</p>
          <h1 id="hero-title" className="hero-title-art">
            <span className="sr-only">Tchitundo-Hulo</span>
            <img src="/media/tchitundo-hulo-lettering-transparent.png" alt="" aria-hidden="true" />
          </h1>
          <div className="incision-rule" aria-hidden="true"><span>||||</span></div>
          <p className="hero-lead">Marcas na pedra. Memória viva.</p>
          <a className="text-link hero-cta" href="#campanha">
            Explorar a história <span aria-hidden="true">→</span>
          </a>
        </div>

        <a className="scroll-cue" href="#campanha" aria-label="Descer para a campanha">
          <span aria-hidden="true">⌄</span>
        </a>

        <div className="hero-portals" aria-label="Entradas principais">
          {portals.map((portal) => (
            <a href={portal.href} key={portal.id}>
              <span className={`portal-mark portal-mark-${portal.mark}`} aria-hidden="true" />
              <strong>{portal.label}</strong>
              <i aria-hidden="true">→</i>
            </a>
          ))}
        </div>
      </section>

      <section className="campaign section-dark" id="campanha" aria-labelledby="campaign-title">
        <div className="shell section-grid">
          <div className="section-index" aria-hidden="true">01 / 08</div>
          <div className="campaign-copy">
            <p className="eyebrow">A campanha</p>
            <h2 id="campaign-title">Quando preservar<br />é avançar.</h2>
            <p className="large-copy">
              Tchitundo-Hulo é uma iniciativa de valorização do património cultural angolano promovida pelo Standard Bank de Angola.
            </p>
            <p>
              Mais do que olhar para o passado, a campanha reconhece na memória um ponto de partida para o futuro. Aproxima pessoas, conhecimento e território através de uma narrativa viva, respeitosa e duradoura.
            </p>
            <a className="text-link" href="#territorio">Conhecer Tchitundo-Hulo <span aria-hidden="true">→</span></a>
          </div>
          <figure className="campaign-visual">
            <img src="/media/community-rock.jpg" alt="Comunidade junto às formações rochosas de Tchitundo-Hulo" />
            <figcaption><span>15°37&apos; S</span><span>12°48&apos; E</span><strong>Namibe · Angola</strong></figcaption>
          </figure>
        </div>
      </section>

      <section className="territory" id="territorio" aria-labelledby="territory-title">
        <div className="shell territory-heading">
          <div>
            <p className="eyebrow dark">O lugar</p>
            <h2 id="territory-title">Uma biblioteca<br />a céu aberto.</h2>
          </div>
          <p>
            No sul de Angola, formações rochosas guardam um dos mais extraordinários conjuntos de arte rupestre do país. Tchitundo-Hulo reúne gravuras e pinturas que testemunham formas antigas de habitar, interpretar e representar o mundo.
          </p>
        </div>
        <div className="territory-stage shell">
          <div className="territory-image">
            <img src="/media/engraving-circles.jpg" alt="Gravuras circulares de Tchitundo-Hulo" />
            <span className="image-marker marker-one">Mukai</span>
            <span className="image-marker marker-two">Mulume</span>
          </div>
          <div className="territory-notes">
            <article>
              <span>01</span>
              <h3>Tchitundo-Hulo Mulume</h3>
              <p>O núcleo principal, marcado por composições geométricas, figuras humanas e sinais cuja leitura atravessa gerações.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Tchitundo-Hulo Mukai</h3>
              <p>Uma paisagem cultural complementar, onde território, memória colectiva e expressão simbólica permanecem inseparáveis.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="manifesto" id="impacto" aria-label="Manifesto de preservação">
        <div className="manifesto-image" aria-hidden="true" />
        <div className="shell manifesto-content">
          <p className="eyebrow">Impacto e preservação</p>
          <blockquote>“O património não é apenas aquilo que recebemos. É aquilo que escolhemos transmitir.”</blockquote>
          <p>Standard Bank Angola</p>
        </div>
      </section>

      <section className="gallery-section section-dark" id="galeria" aria-labelledby="gallery-title">
        <div className="shell gallery-heading">
          <div>
            <p className="eyebrow">Galeria</p>
            <h2 id="gallery-title">Ver de perto.<br />Compreender melhor.</h2>
          </div>
          <p>Um arquivo visual dedicado ao território, às gravuras e aos detalhes que fazem de Tchitundo-Hulo um lugar singular na memória de Angola.</p>
        </div>
        <div className="gallery-grid shell" onContextMenu={(event) => event.preventDefault()}>
          {gallery.map((image, index) => (
            <button
              className={`gallery-item ${image.orientation}`}
              type="button"
              key={image.src}
              onClick={() => setSelectedIndex(index)}
              aria-label={`Ampliar imagem: ${image.label}`}
            >
              <img src={image.src} alt={image.alt} draggable={false} loading={index > 1 ? "lazy" : "eager"} />
              <span><i>{String(index + 1).padStart(2, "0")}</i>{image.label}<b>＋</b></span>
            </button>
          ))}
        </div>
        <p className="gallery-notice shell">Imagens disponibilizadas para consulta editorial. Todos os direitos reservados.</p>
      </section>

      <section className="film" id="filme" aria-labelledby="film-title">
        <div className="film-photo" aria-hidden="true" />
        <div className="shell film-content">
          <p className="eyebrow">Filme da campanha</p>
          <h2 id="film-title">A pedra fala.<br />Angola escuta.</h2>
          <p>Uma narrativa audiovisual sobre território, memória e o compromisso de preservar.</p>
          <button className="play-button" type="button" onClick={() => setFilmOpen(true)}>
            <span aria-hidden="true">▶</span> Ver apresentação do filme
          </button>
        </div>
        <div className="film-meta"><span>Documentário</span><span>Em preparação</span><span>PT</span></div>
      </section>

      <section className="culture" id="cultura" aria-labelledby="culture-title">
        <div className="shell culture-layout">
          <div className="culture-intro">
            <div>
              <p className="eyebrow dark">Cultura e agenda</p>
              <h2 id="culture-title">A cultura<br />continua.</h2>
            </div>
            <div className="culture-intro-copy">
              <p>Um espaço editorial permanente para acompanhar encontros, experiências e conteúdos que aproximam o património das comunidades.</p>
              <span className="agenda-status">Agenda editorial 2026</span>
            </div>
          </div>
          <div className="agenda-list">
            {agenda.map((item, index) => (
              <article className={index === 0 ? "agenda-featured" : ""} key={item.id}>
                <div className="agenda-media">
                  <img src={item.image} alt="" loading="lazy" />
                </div>
                <div className="agenda-card-content">
                  <div className="agenda-card-meta"><span>{item.number}</span><p>{item.type}</p></div>
                  <h3>{item.title}</h3>
                  <small>{item.detail}</small>
                  <div className="agenda-card-footer"><strong>{item.status}</strong><i aria-hidden="true">↗</i></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="documents section-dark" id="documentos" aria-labelledby="documents-title">
        <div className="shell documents-layout">
          <div>
            <p className="eyebrow">Documentos</p>
            <h2 id="documents-title">Conhecimento<br />para consultar.</h2>
          </div>
          <div className="document-list">
            {documents.map((item) => item.available && item.href ? (
              <a href={item.href} download key={item.id}>
                <span>PDF</span>
                <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                <i aria-hidden="true">↓</i>
              </a>
            ) : (
              <div className="document-coming" key={item.id}>
                <span>PDF</span>
                <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                <i aria-hidden="true">Breve</i>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="archive" id="arquivo" aria-labelledby="archive-title">
        <div className="shell archive-heading">
          <div><p className="eyebrow dark">Arquivo de campanhas</p><h2 id="archive-title">Uma plataforma<br />feita para continuar.</h2></div>
          <p>Tchitundo-Hulo inaugura uma arquitectura editorial preparada para reunir futuras iniciativas do Banco nas áreas da cultura, comunidade, educação financeira e impacto social.</p>
        </div>
        <div className="archive-grid shell">
          {archive.map((item) => (
            <article className={item.active ? "active" : ""} key={item.id}>
              <span>{item.year}</span>
              <div><small>{item.tag}</small><h3>{item.title}</h3></div>
              <i aria-hidden="true">{item.active ? "→" : "+"}</i>
            </article>
          ))}
        </div>
      </section>

      <section className="closing" aria-labelledby="closing-title">
        <div className="closing-photo" aria-hidden="true" />
        <div className="shell closing-content">
          <p className="eyebrow">Standard Bank Angola</p>
          <h2 id="closing-title">Da identidade<br />ao futuro.</h2>
          <p>Continuamos a acreditar numa Angola que reconhece o valor da sua história e transforma essa memória em possibilidade.</p>
          <a className="text-link" href="#inicio">Voltar ao início <span aria-hidden="true">↑</span></a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="shell footer-top">
          <img src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" />
          <nav aria-label="Navegação do rodapé">
            <a href="#campanha">Campanha</a><a href="#territorio">Tchitundo-Hulo</a><a href="#galeria">Galeria</a><a href="#cultura">Cultura</a><a href="#documentos">Documentos</a>
          </nav>
        </div>
        <div className="shell footer-bottom"><span>© 2026 Standard Bank Angola</span><span>Património · Identidade · Futuro</span></div>
      </footer>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-inner">
          <p>Explorar</p>
          <a href="#campanha" onClick={closeMenu}>A campanha <span>01</span></a>
          <a href="#territorio" onClick={closeMenu}>O lugar <span>02</span></a>
          <a href="#galeria" onClick={closeMenu}>Galeria <span>03</span></a>
          <a href="#cultura" onClick={closeMenu}>Cultura e agenda <span>04</span></a>
          <a href="#arquivo" onClick={closeMenu}>Arquivo <span>05</span></a>
        </div>
      </div>

      {selectedImage && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={selectedImage.label} onClick={() => setSelectedIndex(null)}>
          <button className="lightbox-close" type="button" onClick={() => setSelectedIndex(null)} aria-label="Fechar imagem">×</button>
          <button
            className="gallery-nav gallery-nav-prev"
            type="button"
            onClick={(event) => { event.stopPropagation(); moveGallery(-1); }}
            aria-label="Imagem anterior"
          >
            ←
          </button>
          <figure onClick={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
            <img src={selectedImage.src} alt={selectedImage.alt} draggable={false} />
            <figcaption><span>{selectedImage.label}</span><b>{String((selectedIndex ?? 0) + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}</b></figcaption>
          </figure>
          <button
            className="gallery-nav gallery-nav-next"
            type="button"
            onClick={(event) => { event.stopPropagation(); moveGallery(1); }}
            aria-label="Imagem seguinte"
          >
            →
          </button>
        </div>
      )}

      {filmOpen && (
        <div className="film-modal" role="dialog" aria-modal="true" aria-labelledby="film-modal-title" onClick={() => setFilmOpen(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setFilmOpen(false)} aria-label="Fechar">×</button>
            <span className="film-icon" aria-hidden="true">▶</span>
            <p className="eyebrow">Documentário</p>
            <h3 id="film-modal-title">O filme está em preparação.</h3>
            <p>Este módulo está pronto para receber o documentário e os conteúdos audiovisuais oficiais da campanha.</p>
          </div>
        </div>
      )}
    </main>
  );
}
