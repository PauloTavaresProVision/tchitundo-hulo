import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { siteContent, type SiteContent } from "@/content/site-content";

const defaultContentPath = path.join(process.cwd(), "data", "content.json");

function contentPath() {
  return process.env.CONTENT_DATA_PATH || defaultContentPath;
}

export function defaultSiteContent(): SiteContent {
  return structuredClone(siteContent);
}

export async function readSiteContent(): Promise<SiteContent> {
  try {
    const raw = await readFile(contentPath(), "utf8");
    const value = JSON.parse(raw) as unknown;
    const normalized = normalizeSiteContent(value);
    if (!normalized) throw new Error("Invalid content structure");
    return normalized;
  } catch (error) {
    if (isMissingFile(error)) return defaultSiteContent();
    throw error;
  }
}

export async function writeSiteContent(value: unknown): Promise<SiteContent> {
  const normalized = normalizeSiteContent(value);
  if (!normalized || !hasValidSeo(normalized.seo)) throw new Error("Estrutura de conteúdo inválida.");

  const target = contentPath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(normalized, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
  return normalized;
}

function normalizeSiteContent(value: unknown): SiteContent | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.portals) || !Array.isArray(value.gallery)) return null;
  if (!Array.isArray(value.agenda) || !Array.isArray(value.documents) || !Array.isArray(value.archive)) return null;
  if ([value.portals, value.gallery, value.agenda, value.documents, value.archive].some((collection) => collection.length > 500)) return null;

  const collectionsAreValid = value.portals.every((item) => hasStrings(item, ["id", "label", "href", "mark"]) && isRecord(item) && /^#[a-z0-9_-]+$/i.test(String(item.href)) && ["agenda", "campaign", "place"].includes(String(item.mark)))
    && value.gallery.every((item) => hasStrings(item, ["id", "src", "alt", "label", "orientation"]) && isRecord(item) && safePublicUrl(item.src) && ["wide", "tall", "standard"].includes(String(item.orientation)))
    && value.agenda.every((item) => hasStrings(item, ["id", "number", "type", "title", "detail", "status", "image"]) && isRecord(item) && safePublicUrl(item.image))
    && value.documents.every((item) => isRecord(item) && hasStrings(item, ["id", "title", "detail"]) && typeof item.available === "boolean" && (item.href === undefined || (typeof item.href === "string" && safePublicUrl(item.href))))
    && value.archive.every((item) => hasStrings(item, ["id", "year", "title", "tag"]));
  if (!collectionsAreValid) return null;

  const fallbackSeo = defaultSiteContent().seo;
  const seo = hasValidSeo(value.seo) ? value.seo : fallbackSeo;
  return { ...value, seo } as SiteContent;
}

function hasValidSeo(value: unknown): value is SiteContent["seo"] {
  return isRecord(value)
    && hasStrings(value, ["title", "description", "keywords", "canonicalUrl", "ogImage"])
    && String(value.title).length <= 120
    && String(value.description).length <= 500
    && String(value.keywords).length <= 1_000
    && (value.canonicalUrl === "" || safePublicUrl(value.canonicalUrl))
    && safePublicUrl(value.ogImage)
    && typeof value.indexable === "boolean";
}

function hasStrings(value: unknown, keys: string[]) {
  return isRecord(value) && keys.every((key) => typeof value[key] === "string" && String(value[key]).length <= 10_000);
}

function safePublicUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2_048) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingFile(error: unknown) {
  return isRecord(error) && error.code === "ENOENT";
}
