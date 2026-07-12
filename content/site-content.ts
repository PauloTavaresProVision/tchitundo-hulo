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

export type SiteContent = {
  seo: SeoSettings;
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
  portals: [
    { id: "agenda", label: "Agenda cultural", href: "#cultura", mark: "agenda" },
    { id: "campaign", label: "A campanha", href: "#campanha", mark: "campaign" },
    { id: "place", label: "O lugar", href: "#territorio", mark: "place" },
  ],
  gallery: [
    {
      id: "territory-human",
      src: "/media/community-rock.jpg",
      alt: "Comunidade junto às formações rochosas de Tchitundo-Hulo",
      label: "O território é humano",
      orientation: "wide",
    },
    {
      id: "portrait-continuity",
      src: "/media/community-portrait-vertical.jpg",
      alt: "Retrato de uma mulher da comunidade do sul de Angola",
      label: "Rosto e permanência",
      orientation: "tall",
    },
    {
      id: "memory-stone",
      src: "/media/gallery-rock-01.jpg",
      alt: "Painel de gravuras rupestres de Tchitundo-Hulo",
      label: "Memória sobre pedra",
      orientation: "wide",
    },
    {
      id: "living-culture",
      src: "/media/community-women.jpg",
      alt: "Mulheres da comunidade em vestes tradicionais",
      label: "Cultura que continua",
      orientation: "wide",
    },
    {
      id: "ancestral-geometries",
      src: "/media/engraving-circles.jpg",
      alt: "Conjunto de gravuras circulares sobre uma superfície rochosa",
      label: "Geometrias ancestrais",
      orientation: "wide",
    },
    {
      id: "presence",
      src: "/media/community-portrait.jpg",
      alt: "Retrato de uma mulher da comunidade na paisagem do Namibe",
      label: "Presença",
      orientation: "standard",
    },
    {
      id: "trace-continuity",
      src: "/media/gallery-rock-02.jpg",
      alt: "Detalhe vertical de uma figura rupestre",
      label: "Traço e continuidade",
      orientation: "tall",
    },
    {
      id: "knows-the-way",
      src: "/media/community-guide.jpg",
      alt: "Homem da comunidade diante da paisagem de Tchitundo-Hulo",
      label: "Quem conhece o caminho",
      orientation: "wide",
    },
    {
      id: "stone-sky",
      src: "/media/rock-silhouette-vertical.jpg",
      alt: "Recorte monumental de uma formação rochosa contra o céu azul",
      label: "A pedra e o céu",
      orientation: "tall",
    },
    {
      id: "guarding-landscape",
      src: "/media/hero-aerial.jpg",
      alt: "Vista ampla da paisagem rochosa de Tchitundo-Hulo",
      label: "A paisagem que guarda",
      orientation: "standard",
    },
  ] satisfies GalleryItem[],
  agenda: [
    {
      id: "heritage-conversations",
      number: "01",
      type: "Encontro",
      title: "Conversas sobre património",
      detail: "Investigadores, comunidade e novas leituras sobre Tchitundo-Hulo.",
      status: "Programação a anunciar",
      image: "/media/community-women.jpg",
    },
    {
      id: "engravings-route",
      number: "02",
      type: "Experiência",
      title: "Rota das gravuras",
      detail: "Uma aproximação responsável ao território, à paisagem e à memória.",
      status: "Em preparação",
      image: "/media/community-rock.jpg",
    },
    {
      id: "memory-future",
      number: "03",
      type: "Educação",
      title: "Memória e futuro",
      detail: "Conteúdos pedagógicos para aproximar novas gerações do património.",
      status: "Conteúdo editorial",
      image: "/media/engraving-circles.jpg",
    },
  ] satisfies AgendaItem[],
  documents: [
    {
      id: "image-bank-report",
      title: "Relatório do banco de imagens",
      detail: "Documento institucional · 2,6 MB",
      href: "/documents/relatorio-banco-imagens-tchitundo.pdf",
      available: true,
    },
    {
      id: "campaign-dossier",
      title: "Dossier Tchitundo-Hulo",
      detail: "Publicação editorial · Brevemente",
      available: false,
    },
  ] satisfies DocumentItem[],
  archive: [
    { id: "tchitundo-hulo", year: "2026", title: "Tchitundo-Hulo", tag: "Património cultural", active: true },
    { id: "culture-moving", year: "Próximo", title: "Cultura em movimento", tag: "Plataforma editorial" },
    { id: "community-impact", year: "Arquivo", title: "Comunidade e impacto", tag: "Iniciativas institucionais" },
  ] satisfies CampaignArchiveItem[],
};
