import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { siteContent, type EditorialSettings, type SiteContent } from "@/content/site-content";

type ContentVersion = {
  id: string;
  createdAt: string;
  author: string;
  content: SiteContent;
};

export type ContentVersionSummary = Omit<ContentVersion, "content">;

const defaultDataDirectory = path.join(process.cwd(), "data");
const MAX_HISTORY = 30;
let writeQueue: Promise<unknown> = Promise.resolve();

function contentPath() {
  return process.env.CONTENT_DATA_PATH || path.join(defaultDataDirectory, "content.json");
}

function draftPath() {
  return process.env.CONTENT_DRAFT_PATH || path.join(defaultDataDirectory, "content-draft.json");
}

function historyPath() {
  return process.env.CONTENT_HISTORY_PATH || path.join(defaultDataDirectory, "content-history.json");
}

export function defaultSiteContent(): SiteContent {
  return structuredClone(siteContent);
}

export async function readSiteContent(): Promise<SiteContent> {
  return readContentFile(contentPath(), defaultSiteContent());
}

export async function readDraftSiteContent(): Promise<SiteContent> {
  return readContentFile(draftPath(), await readSiteContent());
}

export async function writeSiteContent(value: unknown): Promise<SiteContent> {
  return saveDraftSiteContent(value);
}

export async function saveDraftSiteContent(value: unknown): Promise<SiteContent> {
  const normalized = normalizeSiteContent(value);
  if (!normalized) throw new Error("Estrutura de conteúdo inválida.");
  await queuedWrite(() => writeJson(draftPath(), normalized));
  return normalized;
}

export async function publishDraftSiteContent(author: string): Promise<SiteContent> {
  return queuedWrite(async () => {
    const published = await readSiteContent();
    const draft = await readDraftSiteContent();
    const history = await readHistory();
    history.unshift({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      author: author.slice(0, 80),
      content: published,
    });
    await writeJson(historyPath(), history.slice(0, MAX_HISTORY));
    await writeJson(contentPath(), draft);
    return draft;
  });
}

export async function listContentVersions(): Promise<ContentVersionSummary[]> {
  return (await readHistory()).map(({ id, createdAt, author }) => ({ id, createdAt, author }));
}

export async function restoreContentVersion(id: string): Promise<SiteContent> {
  const version = (await readHistory()).find((item) => item.id === id);
  if (!version) throw new Error("Versão não encontrada.");
  await queuedWrite(() => writeJson(draftPath(), version.content));
  return structuredClone(version.content);
}

async function readContentFile(target: string, fallback: SiteContent) {
  try {
    const value = JSON.parse(await readFile(target, "utf8")) as unknown;
    const normalized = normalizeSiteContent(value);
    if (!normalized) throw new Error("Invalid content structure");
    return normalized;
  } catch (error) {
    if (isMissingFile(error)) return fallback;
    throw error;
  }
}

async function readHistory(): Promise<ContentVersion[]> {
  try {
    const parsed = JSON.parse(await readFile(historyPath(), "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.createdAt !== "string" || typeof item.author !== "string") return [];
      const content = normalizeSiteContent(item.content);
      return content ? [{ id: item.id, createdAt: item.createdAt, author: item.author, content }] : [];
    }).slice(0, MAX_HISTORY);
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
}

function normalizeSiteContent(value: unknown): SiteContent | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.portals) || !Array.isArray(value.gallery)) return null;
  if (!Array.isArray(value.agenda) || !Array.isArray(value.documents) || !Array.isArray(value.archive)) return null;
  if ([value.portals, value.gallery, value.agenda, value.documents, value.archive].some((collection) => collection.length > 500)) return null;
  if ([value.portals, value.gallery, value.agenda, value.documents, value.archive].some((collection) => !uniqueIds(collection))) return null;

  const collectionsAreValid = value.portals.every((item) => hasStrings(item, ["id", "label", "href", "mark"]) && isRecord(item) && /^#[a-z0-9_-]+$/i.test(String(item.href)) && ["agenda", "campaign", "place"].includes(String(item.mark)))
    && value.gallery.every((item) => hasStrings(item, ["id", "src", "alt", "label", "orientation"]) && isRecord(item) && safePublicUrl(item.src) && ["wide", "tall", "standard"].includes(String(item.orientation)))
    && value.agenda.every((item) => hasStrings(item, ["id", "number", "type", "title", "detail", "status", "image"]) && isRecord(item) && safePublicUrl(item.image))
    && value.documents.every((item) => isRecord(item) && hasStrings(item, ["id", "title", "detail"]) && typeof item.available === "boolean" && (item.href === undefined || (typeof item.href === "string" && safePublicUrl(item.href))))
    && value.archive.every((item) => hasStrings(item, ["id", "year", "title", "tag"]));
  if (!collectionsAreValid) return null;

  const defaults = defaultSiteContent();
  const seo = hasValidSeo(value.seo) ? value.seo : defaults.seo;
  const editorial = normalizeEditorial(value.editorial, defaults.editorial);
  const video = normalizeStringObject(value.video, defaults.video, ["poster"], ["src"]);
  const legal = normalizeStringObject(value.legal, defaults.legal, [], ["privacyUrl", "termsUrl"]);
  if (!editorial || !video || !legal || typeof video.enabled !== "boolean") return null;

  return {
    seo,
    editorial,
    video: video as SiteContent["video"],
    legal: legal as SiteContent["legal"],
    portals: value.portals as SiteContent["portals"],
    gallery: value.gallery as SiteContent["gallery"],
    agenda: value.agenda as SiteContent["agenda"],
    documents: value.documents as SiteContent["documents"],
    archive: value.archive as SiteContent["archive"],
  };
}

function normalizeEditorial(value: unknown, fallback: EditorialSettings): EditorialSettings | null {
  const candidate = isRecord(value) ? value : {};
  const result: Record<string, unknown> = {};
  const urlFields: Record<keyof EditorialSettings, string[]> = {
    hero: ["backgroundImage", "titleImage"],
    campaign: ["image"],
    territory: ["image"],
    impact: ["backgroundImage"],
    gallery: [],
    culture: [],
    documents: [],
    archive: [],
    closing: ["backgroundImage"],
  };
  for (const key of Object.keys(fallback) as Array<keyof EditorialSettings>) {
    const section = normalizeStringObject(candidate[key], fallback[key], urlFields[key]);
    if (!section) return null;
    result[key] = section;
  }
  return result as EditorialSettings;
}

function normalizeStringObject<T extends Record<string, unknown>>(value: unknown, fallback: T, requiredUrls: string[] = [], optionalUrls: string[] = []): T | null {
  const candidate = isRecord(value) ? value : {};
  const result: Record<string, unknown> = {};
  for (const [key, fallbackValue] of Object.entries(fallback)) {
    const next = candidate[key] ?? fallbackValue;
    if (typeof fallbackValue === "string") {
      if (typeof next !== "string" || next.length > 10_000) return null;
      if (requiredUrls.includes(key) && !safePublicUrl(next)) return null;
      if (optionalUrls.includes(key) && next !== "" && !safePublicUrl(next)) return null;
    } else if (typeof fallbackValue === "boolean" && typeof next !== "boolean") return null;
    result[key] = next;
  }
  return result as T;
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

function uniqueIds(collection: unknown[]) {
  const ids = collection.map((item) => isRecord(item) && typeof item.id === "string" ? item.id : "");
  return ids.every(Boolean) && new Set(ids).size === ids.length;
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

async function writeJson(target: string, value: unknown) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
}

async function queuedWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingFile(error: unknown) {
  return isRecord(error) && error.code === "ENOENT";
}
