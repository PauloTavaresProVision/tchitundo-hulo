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
    if (!isSiteContent(value)) throw new Error("Invalid content structure");
    return value;
  } catch (error) {
    if (isMissingFile(error)) return defaultSiteContent();
    throw error;
  }
}

export async function writeSiteContent(value: unknown): Promise<SiteContent> {
  if (!isSiteContent(value)) throw new Error("Estrutura de conteúdo inválida.");

  const target = contentPath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  return value;
}

function isSiteContent(value: unknown): value is SiteContent {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.portals) || !Array.isArray(value.gallery)) return false;
  if (!Array.isArray(value.agenda) || !Array.isArray(value.documents) || !Array.isArray(value.archive)) return false;

  return value.portals.every((item) => hasStrings(item, ["id", "label", "href", "mark"]))
    && value.gallery.every((item) => hasStrings(item, ["id", "src", "alt", "label", "orientation"]))
    && value.agenda.every((item) => hasStrings(item, ["id", "number", "type", "title", "detail", "status", "image"]))
    && value.documents.every((item) => isRecord(item) && hasStrings(item, ["id", "title", "detail"]) && typeof item.available === "boolean")
    && value.archive.every((item) => hasStrings(item, ["id", "year", "title", "tag"]));
}

function hasStrings(value: unknown, keys: string[]) {
  return isRecord(value) && keys.every((key) => typeof value[key] === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingFile(error: unknown) {
  return isRecord(error) && error.code === "ENOENT";
}
