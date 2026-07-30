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

export type NewsItem = {
  id: string;
  slug: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
  image: string;
  imageAlt: string;
  published: boolean;
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

export type SiteSettings = {
  agendaEnabled: boolean;
  newsEnabled: boolean;
  languageSwitcherEnabled: boolean;
};

export type SiteLocale = "pt" | "en";

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
  news: { eyebrow: string; title: string; description: string };
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
  corporateNotice: string;
  cookiesLabel: string;
  cookiesUrl: string;
  privacyLabel: string;
  privacyUrl: string;
  termsLabel: string;
  termsUrl: string;
};

export type LocalizedSiteContent = {
  seo: SeoSettings;
  editorial: EditorialSettings;
  video: VideoSettings;
  legal: LegalSettings;
  portals: PortalItem[];
  gallery: GalleryItem[];
  news: NewsItem[];
  agenda: AgendaItem[];
  documents: DocumentItem[];
  archive: CampaignArchiveItem[];
};

export type SiteContent = LocalizedSiteContent & {
  settings: SiteSettings;
  translations: {
    en: LocalizedSiteContent;
  };
};

export type ResolvedSiteContent = LocalizedSiteContent & {
  settings: SiteSettings;
};

export const siteContent: SiteContent = {
  settings: {
    agendaEnabled: false,
    newsEnabled: true,
    languageSwitcherEnabled: true,
  },
  seo: {
    title: "Tchitundu-Hulu | Standard Bank Angola",
    description: "Uma plataforma editorial dedicada ao património, à memória e ao futuro de Angola.",
    keywords: "Tchitundu-Hulu, património cultural, Angola, arte rupestre, Standard Bank Angola",
    canonicalUrl: "",
    ogImage: "/media/hero-sunset-portal.png",
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
      intro: "Tchitundu-Hulu é uma iniciativa de valorização do património cultural angolano promovida pelo Standard Bank de Angola.",
      body: "Mais do que olhar para o passado, a campanha reconhece na memória um ponto de partida para o futuro. Aproxima pessoas, conhecimento e território através de uma narrativa viva, respeitosa e duradoura.",
      ctaLabel: "Conhecer Tchitundu-Hulu",
      image: "/media/community-rock.jpg",
      imageAlt: "Comunidade junto às formações rochosas de Tchitundu-Hulu",
      location: "Namibe · Angola",
    },
    territory: {
      eyebrow: "O lugar",
      title: "Uma biblioteca\na céu aberto.",
      intro: "No sul de Angola, formações rochosas guardam um dos mais extraordinários conjuntos de arte rupestre do país. Tchitundu-Hulu reúne gravuras e pinturas que testemunham formas antigas de habitar, interpretar e representar o mundo.",
      image: "/media/engraving-circles.jpg",
      imageAlt: "Gravuras circulares de Tchitundu-Hulu",
      markerOne: "Mukai",
      markerTwo: "Mulume",
      noteOneTitle: "Tchitundu-Hulu Mulume",
      noteOneBody: "O núcleo principal, marcado por composições geométricas, figuras humanas e sinais cuja leitura atravessa gerações.",
      noteTwoTitle: "Tchitundu-Hulu Mukai",
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
      description: "Um arquivo visual dedicado ao território, às gravuras e aos detalhes que fazem de Tchitundu-Hulu um lugar singular na memória de Angola.",
      notice: "Fotografias disponíveis para consulta e download. Consulte os termos de utilização antes de reutilizar.",
    },
    news: {
      eyebrow: "Notícias",
      title: "Histórias que\ncontinuam.",
      description: "Atualizações, iniciativas e conteúdos da campanha Tchitundu-Hulu.",
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
      description: "Tchitundu-Hulu inaugura uma arquitectura editorial preparada para reunir futuras iniciativas do Banco nas áreas da cultura, comunidade, educação financeira e impacto social.",
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
    buttonLabel: "Ver documentário",
    type: "Documentário",
    status: "Disponível",
    language: "PT",
    poster: "/media/community-guide.jpg",
    src: "https://www.youtube.com/watch?v=RXZhH_Ide44",
    enabled: true,
  },
  legal: {
    copyright: "© 2026 Standard Bank Angola",
    strapline: "Património · Identidade · Futuro",
    corporateNotice: "STANDARD BANK DE ANGOLA, S.A., sociedade de direito Angolano, matriculada na Conservatória de Registo Comercial de Luanda sob o n.º 631-10, Contribuinte Fiscal n.º 5417093386 e sede social no Inara Business Park & Gardens, Torre 1, Via A2, Distrito Urbano de Talatona, Município de Talatona, Luanda – Angola",
    cookiesLabel: "Gestão de cookies",
    cookiesUrl: "https://www.standardbank.co.ao/angola/pt/sobre-nos/legal/Gest%C3%A3o-de-Cookies",
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
    { id: "territory-human", src: "/media/community-rock.jpg", alt: "Comunidade junto às formações rochosas de Tchitundu-Hulu", label: "O território é humano", orientation: "wide" },
    { id: "portrait-continuity", src: "/media/community-portrait-vertical.jpg", alt: "Retrato de uma mulher da comunidade do sul de Angola", label: "Rosto e permanência", orientation: "tall" },
    { id: "memory-stone", src: "/media/gallery-rock-01.jpg", alt: "Painel de gravuras rupestres de Tchitundu-Hulu", label: "Memória sobre pedra", orientation: "wide" },
    { id: "living-culture", src: "/media/community-women.jpg", alt: "Mulheres da comunidade em vestes tradicionais", label: "Cultura que continua", orientation: "wide" },
    { id: "ancestral-geometries", src: "/media/engraving-circles.jpg", alt: "Conjunto de gravuras circulares sobre uma superfície rochosa", label: "Geometrias ancestrais", orientation: "wide" },
    { id: "presence", src: "/media/community-portrait.jpg", alt: "Retrato de uma mulher da comunidade na paisagem do Namibe", label: "Presença", orientation: "standard" },
    { id: "trace-continuity", src: "/media/gallery-rock-02.jpg", alt: "Detalhe vertical de uma figura rupestre", label: "Traço e continuidade", orientation: "tall" },
    { id: "knows-the-way", src: "/media/community-guide.jpg", alt: "Homem da comunidade diante da paisagem de Tchitundu-Hulu", label: "Quem conhece o caminho", orientation: "wide" },
    { id: "stone-sky", src: "/media/rock-silhouette-vertical.jpg", alt: "Recorte monumental de uma formação rochosa contra o céu azul", label: "A pedra e o céu", orientation: "tall" },
    { id: "guarding-landscape", src: "/media/hero-aerial.jpg", alt: "Vista ampla da paisagem rochosa de Tchitundu-Hulu", label: "A paisagem que guarda", orientation: "standard" },
  ],
  news: [
    {
      id: "campaign-launch",
      slug: "standard-bank-valoriza-tchitundu-hulu",
      category: "Património cultural",
      title: "Standard Bank valoriza o património de Tchitundu-Hulu",
      summary: "Uma iniciativa que aproxima memória, território e futuro através da valorização de um património singular de Angola.",
      body: "O Standard Bank de Angola apresenta Tchitundu-Hulu como parte do seu compromisso com a valorização do património cultural angolano.\n\nA iniciativa reúne fotografia, documentário e conteúdos editoriais para aproximar novas gerações das gravuras e pinturas rupestres do sul de Angola.\n\nMais do que preservar imagens, o projeto procura ampliar o conhecimento, estimular o diálogo e reconhecer a cultura como parte essencial do futuro do país.",
      publishedAt: "2026-08-17",
      image: "/media/community-rock.jpg",
      imageAlt: "Comunidade junto às formações rochosas de Tchitundu-Hulu",
      published: false,
    },
  ],
  agenda: [
    { id: "heritage-conversations", number: "01", type: "Encontro", title: "Conversas sobre património", detail: "Investigadores, comunidade e novas leituras sobre Tchitundu-Hulu.", status: "Programação a anunciar", image: "/media/community-women.jpg" },
    { id: "engravings-route", number: "02", type: "Experiência", title: "Rota das gravuras", detail: "Uma aproximação responsável ao território, à paisagem e à memória.", status: "Em preparação", image: "/media/community-rock.jpg" },
    { id: "memory-future", number: "03", type: "Educação", title: "Memória e futuro", detail: "Conteúdos pedagógicos para aproximar novas gerações do património.", status: "Conteúdo editorial", image: "/media/engraving-circles.jpg" },
  ],
  documents: [
    { id: "image-bank-report", title: "Relatório do banco de imagens", detail: "Documento institucional · 2,6 MB", href: "/documents/relatorio-banco-imagens-tchitundo.pdf", available: true },
    { id: "campaign-dossier", title: "Dossier Tchitundu-Hulu", detail: "Publicação editorial · Brevemente", available: false },
  ],
  archive: [
    { id: "tchitundo-hulo", year: "2026", title: "Tchitundu-Hulu", tag: "Património cultural", active: true },
    { id: "culture-moving", year: "Próximo", title: "Cultura em movimento", tag: "Plataforma editorial" },
    { id: "community-impact", year: "Arquivo", title: "Comunidade e impacto", tag: "Iniciativas institucionais" },
  ],
  translations: {
    en: createEnglishSiteContent(),
  },
};

function createEnglishSiteContent(): LocalizedSiteContent {
  return {
    seo: {
      title: "Tchitundu-Hulu | Standard Bank Angola",
      description: "An editorial platform dedicated to Angola's heritage, memory and future.",
      keywords: "Tchitundu-Hulu, cultural heritage, Angola, rock art, Standard Bank Angola",
      canonicalUrl: "",
      ogImage: "/media/hero-sunset-portal.png",
      indexable: true,
    },
    editorial: {
      hero: {
        eyebrow: "Heritage · Angola · Future",
        lead: "Marks in stone. Living memory.",
        ctaLabel: "Explore the story",
        backgroundImage: "/media/hero-sunset-portal.png",
        titleImage: "/media/tchitundo-hulo-lettering-transparent.png",
      },
      campaign: {
        eyebrow: "The campaign",
        title: "When preserving\nmeans moving forward.",
        intro: "Tchitundu-Hulu is a Standard Bank Angola initiative dedicated to celebrating and preserving Angola's cultural heritage.",
        body: "The campaign recognises memory as a starting point for the future. Through photography, film and editorial content, it connects people, knowledge and territory in a living, respectful and lasting narrative.",
        ctaLabel: "Discover Tchitundu-Hulu",
        image: "/media/community-rock.jpg",
        imageAlt: "Community members beside the rock formations of Tchitundu-Hulu",
        location: "Namibe · Angola",
      },
      territory: {
        eyebrow: "The place",
        title: "An open-air\nlibrary.",
        intro: "In southern Angola, rock formations preserve one of the country's most important collections of rock art. Tchitundu-Hulu brings together engravings and paintings left by peoples who inhabited this desert thousands of years ago.",
        image: "/media/engraving-circles.jpg",
        imageAlt: "Circular engravings at Tchitundu-Hulu",
        markerOne: "Mukai",
        markerTwo: "Mulume",
        noteOneTitle: "Tchitundu-Hulu Mulume",
        noteOneBody: "The main site is marked by geometric compositions, human figures and signs whose meaning has travelled across generations.",
        noteTwoTitle: "Tchitundu-Hulu Mukai",
        noteTwoBody: "A complementary cultural landscape where territory, collective memory and symbolic expression remain inseparable.",
      },
      impact: {
        eyebrow: "Impact and preservation",
        quote: "Heritage is not only what we receive. It is what we choose to pass on.",
        attribution: "Standard Bank Angola",
        backgroundImage: "/media/gallery-rock-05.jpg",
      },
      gallery: {
        eyebrow: "Gallery",
        title: "Look closer.\nUnderstand more.",
        description: "A visual archive of the territory, its engravings and the details that make Tchitundu-Hulu a singular place in Angola's memory.",
        notice: "Photographs are available for viewing and download. Please consult the terms of use before reusing them.",
      },
      news: {
        eyebrow: "News",
        title: "Stories that\ncontinue.",
        description: "News, initiatives and editorial content from the Tchitundu-Hulu campaign.",
      },
      culture: {
        eyebrow: "Culture and events",
        title: "Culture\ncontinues.",
        description: "A permanent editorial space for encounters, experiences and content that bring heritage closer to communities.",
        status: "Editorial programme 2026",
      },
      documents: { eyebrow: "Documents", title: "Knowledge\nto explore." },
      archive: {
        eyebrow: "Campaign archive",
        title: "A platform\nbuilt to continue.",
        description: "Tchitundu-Hulu opens an editorial platform designed to bring together future Standard Bank initiatives in culture, community, financial education and social impact.",
      },
      closing: {
        eyebrow: "Standard Bank Angola",
        title: "From identity\nto the future.",
        description: "We continue to believe in an Angola that recognises the value of its history and transforms memory into possibility.",
        backgroundImage: "/media/hero-aerial.jpg",
      },
    },
    video: {
      eyebrow: "Campaign film",
      title: "Stone speaks.\nAngola listens.",
      description: "An audiovisual journey through territory, memory and the commitment to preserve.",
      buttonLabel: "Watch the documentary",
      type: "Documentary",
      status: "Available",
      language: "PT · English subtitles",
      poster: "/media/community-guide.jpg",
      src: "https://www.youtube.com/watch?v=RXZhH_Ide44",
      enabled: true,
    },
    legal: {
      copyright: "© 2026 Standard Bank Angola",
      strapline: "Heritage · Identity · Future",
      corporateNotice: "STANDARD BANK DE ANGOLA, S.A., a company incorporated under Angolan law, registered with the Luanda Commercial Registry under no. 631-10, Tax Identification no. 5417093386, with registered office at Inara Business Park & Gardens, Tower 1, Via A2, Talatona Urban District, Municipality of Talatona, Luanda – Angola",
      cookiesLabel: "Cookie settings",
      cookiesUrl: "https://www.standardbank.co.ao/angola/pt/sobre-nos/legal/Gest%C3%A3o-de-Cookies",
      privacyLabel: "Privacy",
      privacyUrl: "",
      termsLabel: "Terms of use",
      termsUrl: "",
    },
    portals: [
      { id: "agenda", label: "Cultural agenda", href: "#cultura", mark: "agenda" },
      { id: "campaign", label: "The campaign", href: "#campanha", mark: "campaign" },
      { id: "place", label: "The place", href: "#territorio", mark: "place" },
    ],
    gallery: [
      { id: "territory-human", src: "/media/community-rock.jpg", alt: "Community members beside the rock formations of Tchitundu-Hulu", label: "A human territory", orientation: "wide" },
      { id: "portrait-continuity", src: "/media/community-portrait-vertical.jpg", alt: "Portrait of a woman from a community in southern Angola", label: "Presence and continuity", orientation: "tall" },
      { id: "memory-stone", src: "/media/gallery-rock-01.jpg", alt: "Rock art panel at Tchitundu-Hulu", label: "Memory on stone", orientation: "wide" },
      { id: "living-culture", src: "/media/community-women.jpg", alt: "Women from the community wearing traditional clothing", label: "A culture that continues", orientation: "wide" },
      { id: "ancestral-geometries", src: "/media/engraving-circles.jpg", alt: "Circular engravings on a rock surface", label: "Ancestral geometries", orientation: "wide" },
      { id: "presence", src: "/media/community-portrait.jpg", alt: "Portrait of a woman in the Namibe landscape", label: "Presence", orientation: "standard" },
      { id: "trace-continuity", src: "/media/gallery-rock-02.jpg", alt: "Detail of a vertical figure engraved in stone", label: "Trace and continuity", orientation: "tall" },
      { id: "knows-the-way", src: "/media/community-guide.jpg", alt: "A man from the community looking across the Tchitundu-Hulu landscape", label: "Those who know the way", orientation: "wide" },
      { id: "stone-sky", src: "/media/rock-silhouette-vertical.jpg", alt: "A monumental rock formation against a blue sky", label: "Stone and sky", orientation: "tall" },
      { id: "guarding-landscape", src: "/media/hero-aerial.jpg", alt: "A wide view of the rocky landscape of Tchitundu-Hulu", label: "The landscape that remembers", orientation: "standard" },
    ],
    news: [
      {
        id: "campaign-launch",
        slug: "standard-bank-celebrates-tchitundu-hulu",
        category: "Cultural heritage",
        title: "Standard Bank celebrates the heritage of Tchitundu-Hulu",
        summary: "An initiative connecting memory, territory and the future through the celebration of a unique Angolan heritage site.",
        body: "Standard Bank Angola presents Tchitundu-Hulu as part of its commitment to celebrating and preserving Angola's cultural heritage.\n\nThe initiative brings together photography, documentary film and editorial content to connect new generations with the engravings and paintings of southern Angola.\n\nMore than preserving images, the project seeks to broaden knowledge, encourage dialogue and recognise culture as an essential part of the country's future.",
        publishedAt: "2026-08-17",
        image: "/media/community-rock.jpg",
        imageAlt: "Community members beside the rock formations of Tchitundu-Hulu",
        published: false,
      },
    ],
    agenda: [
      { id: "heritage-conversations", number: "01", type: "Encounter", title: "Conversations on heritage", detail: "Researchers, communities and new perspectives on Tchitundu-Hulu.", status: "Programme to be announced", image: "/media/community-women.jpg" },
      { id: "engravings-route", number: "02", type: "Experience", title: "The engravings route", detail: "A responsible approach to territory, landscape and memory.", status: "In preparation", image: "/media/community-rock.jpg" },
      { id: "memory-future", number: "03", type: "Education", title: "Memory and future", detail: "Educational content bringing new generations closer to heritage.", status: "Editorial content", image: "/media/engraving-circles.jpg" },
    ],
    documents: [
      { id: "image-bank-report", title: "Image bank report", detail: "Institutional document · 2.6 MB", href: "/documents/relatorio-banco-imagens-tchitundo.pdf", available: true },
      { id: "campaign-dossier", title: "Tchitundu-Hulu dossier", detail: "Editorial publication · Coming soon", available: false },
    ],
    archive: [
      { id: "tchitundo-hulo", year: "2026", title: "Tchitundu-Hulu", tag: "Cultural heritage", active: true },
      { id: "culture-moving", year: "Next", title: "Culture in motion", tag: "Editorial platform" },
      { id: "community-impact", year: "Archive", title: "Community and impact", tag: "Institutional initiatives" },
    ],
  };
}
