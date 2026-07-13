export type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  label: string;
  orientation: "wide" | "tall" | "standard";
};

export type AgendaItem = {
  id: string;
  number: string;
  type: string;
  title: string;
  detail: string;
  status: string;
  image: string;
};

export type DocumentItem = {
  id: string;
  title: string;
  detail: string;
  href?: string;
  available: boolean;
};

export type CampaignArchiveItem = {
  id: string;
  year: string;
  title: string;
  tag: string;
  active?: boolean;
};

export type PortalItem = {
  id: string;
  label: string;
  href: string;
  mark: "agenda" | "campaign" | "place";
};

export type SeoSettings = {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  indexable: boolean;
};

export type EditorialSettings = {
  hero: {
    eyebrow: string;
    lead: string;
    ctaLabel: string;
    backgroundImage: string;
    titleImage: string;
  };
  campaign: {
    eyebrow: string;
    title: string;
    intro: string;
    body: string;
    ctaLabel: string;
    image: string;
    imageAlt: string;
    location: string;
  };
  territory: {
    eyebrow: string;
    title: string;
    intro: string;
    image: string;
    imageAlt: string;
    markerOne: string;
    markerTwo: string;
    noteOneTitle: string;
    noteOneBody: string;
    noteTwoTitle: string;
    noteTwoBody: string;
  };
  impact: {
    eyebrow: string;
    quote: string;
    attribution: string;
    backgroundImage: string;
  };
  gallery: { eyebrow: string; title: string; description: string; notice: string };
  culture: { eyebrow: string; title: string; description: string; status: string };
  documents: { eyebrow: string; title: string };
  archive: { eyebrow: string; title: string; description: string };
  closing: { eyebrow: string; title: string; description: string; backgroundImage: string };
};

export type VideoSettings = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  type: string;
  status: string;
  language: string;
  poster: string;
  src: string;
  enabled: boolean;
};

export type LegalSettings = {
  copyright: string;
  strapline: string;
  privacyLabel: string;
  privacyUrl: string;
  termsLabel: string;
  termsUrl: string;
};

export type SiteContent = {
  seo: SeoSettings;
  editorial: EditorialSettings;
  video: VideoSettings;
  legal: LegalSettings;
  portals: PortalItem[];
  gallery: GalleryItem[];
  agenda: AgendaItem[];
  documents: DocumentItem[];
  archive: CampaignArchiveItem[];
};

export const siteContent: SiteContent = {
  seo: {
    title: "Tchitundo-Hulo | Standard Bank Angola",
    description: "Uma plataforma editorial dedicada ao património, à memória e ao futuro de Angola.",
    keywords: "Tchitundo-Hulo, património cultural, Angola, arte rupestre, Standard Bank Angola",
    canonicalUrl: "",
    ogImage: "/og.png",
    indexable: true,
  },
  editorial: {
    hero: {
      eyebrow: "Património · Angola · Futuro",
      lead: "Marcas na pedra. Memória viva.",
      ctaLabel: "Explorar a história",
      backgroundImage: "/media/hero-sunset-portal.png",
      titleImage: "/media/tchitundo-hulo-lettering-transparent.png",
    },
    campaign: {
      eyebrow: "A campanha",
      title: "Quando preservar\né avançar.",
      intro: "Tchitundo-Hulo é uma iniciativa de valorização do património cultural angolano promovida pelo Standard Bank de Angola.",
      body: "Mais do que olhar para o passado, a campanha reconhece na memória um ponto de partida para o futuro. Aproxima pessoas, conhecimento e território através de uma narrativa viva, respeitosa e duradoura.",
      ctaLabel: "Conhecer Tchitundo-Hulo",
      image: "/media/community-rock.jpg",
      imageAlt: "Comunidade junto às formações rochosas de Tchitundo-Hulo",
      location: "Namibe · Angola",
    },
    territory: {
      eyebrow: "O lugar",
      title: "Uma biblioteca\na céu aberto.",
      intro: "No sul de Angola, formações rochosas guardam um dos mais extraordinários conjuntos de arte rupestre do país. Tchitundo-Hulo reúne gravuras e pinturas que testemunham formas antigas de habitar, interpretar e representar o mundo.",
      image: "/media/engraving-circles.jpg",
      imageAlt: "Gravuras circulares de Tchitundo-Hulo",
      markerOne: "Mukai",
      markerTwo: "Mulume",
      noteOneTitle: "Tchitundo-Hulo Mulume",
      noteOneBody: "O núcleo principal, marcado por composições geométricas, figuras humanas e sinais cuja leitura atravessa gerações.",
      noteTwoTitle: "Tchitundo-Hulo Mukai",
      noteTwoBody: "Uma paisagem cultural complementar, onde território, memória colectiva e expressão simbólica permanecem inseparáveis.",
    },
    impact: {
      eyebrow: "Impacto e preservação",
      quote: "O património não é apenas aquilo que recebemos. É aquilo que escolhemos transmitir.",
      attribution: "Standard Bank Angola",
      backgroundImage: "/media/gallery-rock-05.jpg",
    },
    gallery: {
      eyebrow: "Galeria",
      title: "Ver de perto.\nCompreender melhor.",
      description: "Um arquivo visual dedicado ao território, às gravuras e aos detalhes que fazem de Tchitundo-Hulo um lugar singular na memória de Angola.",
      notice: "Imagens disponibilizadas para consulta editorial. Todos os direitos reservados.",
    },
    culture: {
      eyebrow: "Cultura e agenda",
      title: "A cultura\ncontinua.",
      description: "Um espaço editorial permanente para acompanhar encontros, experiências e conteúdos que aproximam o património das comunidades.",
      status: "Agenda editorial 2026",
    },
    documents: { eyebrow: "Documentos", title: "Conhecimento\npara consultar." },
    archive: {
      eyebrow: "Arquivo de campanhas",
      title: "Uma plataforma\nfeita para continuar.",
      description: "Tchitundo-Hulo inaugura uma arquitectura editorial preparada para reunir futuras iniciativas do Banco nas áreas da cultura, comunidade, educação financeira e impacto social.",
    },
    closing: {
      eyebrow: "Standard Bank Angola",
      title: "Da identidade\nao futuro.",
      description: "Continuamos a acreditar numa Angola que reconhece o valor da sua história e transforma essa memória em possibilidade.",
      backgroundImage: "/media/hero-aerial.jpg",
    },
  },
  video: {
    eyebrow: "Filme da campanha",
    title: "A pedra fala.\nAngola escuta.",
    description: "Uma narrativa audiovisual sobre território, memória e o compromisso de preservar.",
    buttonLabel: "Ver apresentação do filme",
    type: "Documentário",
    status: "Em preparação",
    language: "PT",
    poster: "/media/community-guide.jpg",
    src: "",
    enabled: false,
  },
  legal: {
    copyright: "© 2026 Standard Bank Angola",
    strapline: "Património · Identidade · Futuro",
    privacyLabel: "Privacidade",
    privacyUrl: "",
    termsLabel: "Termos de utilização",
    termsUrl: "",
  },
  portals: [
    { id: "agenda", label: "Agenda cultural", href: "#cultura", mark: "agenda" },
    { id: "campaign", label: "A campanha", href: "#campanha", mark: "campaign" },
    { id: "place", label: "O lugar", href: "#territorio", mark: "place" },
  ],
  gallery: [
    { id: "territory-human", src: "/media/community-rock.jpg", alt: "Comunidade junto às formações rochosas de Tchitundo-Hulo", label: "O território é humano", orientation: "wide" },
    { id: "portrait-continuity", src: "/media/community-portrait-vertical.jpg", alt: "Retrato de uma mulher da comunidade do sul de Angola", label: "Rosto e permanência", orientation: "tall" },
    { id: "memory-stone", src: "/media/gallery-rock-01.jpg", alt: "Painel de gravuras rupestres de Tchitundo-Hulo", label: "Memória sobre pedra", orientation: "wide" },
    { id: "living-culture", src: "/media/community-women.jpg", alt: "Mulheres da comunidade em vestes tradicionais", label: "Cultura que continua", orientation: "wide" },
    { id: "ancestral-geometries", src: "/media/engraving-circles.jpg", alt: "Conjunto de gravuras circulares sobre uma superfície rochosa", label: "Geometrias ancestrais", orientation: "wide" },
    { id: "presence", src: "/media/community-portrait.jpg", alt: "Retrato de uma mulher da comunidade na paisagem do Namibe", label: "Presença", orientation: "standard" },
    { id: "trace-continuity", src: "/media/gallery-rock-02.jpg", alt: "Detalhe vertical de uma figura rupestre", label: "Traço e continuidade", orientation: "tall" },
    { id: "knows-the-way", src: "/media/community-guide.jpg", alt: "Homem da comunidade diante da paisagem de Tchitundo-Hulo", label: "Quem conhece o caminho", orientation: "wide" },
    { id: "stone-sky", src: "/media/rock-silhouette-vertical.jpg", alt: "Recorte monumental de uma formação rochosa contra o céu azul", label: "A pedra e o céu", orientation: "tall" },
    { id: "guarding-landscape", src: "/media/hero-aerial.jpg", alt: "Vista ampla da paisagem rochosa de Tchitundo-Hulo", label: "A paisagem que guarda", orientation: "standard" },
  ],
  agenda: [
    { id: "heritage-conversations", number: "01", type: "Encontro", title: "Conversas sobre património", detail: "Investigadores, comunidade e novas leituras sobre Tchitundo-Hulo.", status: "Programação a anunciar", image: "/media/community-women.jpg" },
    { id: "engravings-route", number: "02", type: "Experiência", title: "Rota das gravuras", detail: "Uma aproximação responsável ao território, à paisagem e à memória.", status: "Em preparação", image: "/media/community-rock.jpg" },
    { id: "memory-future", number: "03", type: "Educação", title: "Memória e futuro", detail: "Conteúdos pedagógicos para aproximar novas gerações do património.", status: "Conteúdo editorial", image: "/media/engraving-circles.jpg" },
  ],
  documents: [
    { id: "image-bank-report", title: "Relatório do banco de imagens", detail: "Documento institucional · 2,6 MB", href: "/documents/relatorio-banco-imagens-tchitundo.pdf", available: true },
    { id: "campaign-dossier", title: "Dossier Tchitundo-Hulo", detail: "Publicação editorial · Brevemente", available: false },
  ],
  archive: [
    { id: "tchitundo-hulo", year: "2026", title: "Tchitundo-Hulo", tag: "Património cultural", active: true },
    { id: "culture-moving", year: "Próximo", title: "Cultura em movimento", tag: "Plataforma editorial" },
    { id: "community-impact", year: "Arquivo", title: "Comunidade e impacto", tag: "Iniciativas institucionais" },
  ],
};
