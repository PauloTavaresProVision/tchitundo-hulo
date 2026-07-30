import type { LocalizedSiteContent, ResolvedSiteContent, SiteContent, SiteLocale } from "@/content/site-content";

export function resolveSiteContent(content: SiteContent, locale: SiteLocale): ResolvedSiteContent {
  const localized = locale === "en" ? content.translations.en : localizedFields(content);
  return { ...structuredClone(localized), settings: structuredClone(content.settings) };
}

export function adminContentForLocale(content: SiteContent, locale: SiteLocale): SiteContent {
  if (locale === "pt") return content;
  return {
    ...structuredClone(content.translations.en),
    settings: structuredClone(content.settings),
    translations: structuredClone(content.translations),
  };
}

export function localizedFields(content: SiteContent): LocalizedSiteContent {
  return {
    seo: content.seo,
    editorial: content.editorial,
    video: content.video,
    legal: content.legal,
    portals: content.portals,
    gallery: content.gallery,
    news: content.news,
    agenda: content.agenda,
    documents: content.documents,
    archive: content.archive,
  };
}

export function publicHomePath(locale: SiteLocale) {
  return locale === "en" ? "/en" : "/";
}

export function publicNewsPath(locale: SiteLocale, slug: string) {
  return locale === "en" ? `/en/news/${slug}` : `/noticias/${slug}`;
}
