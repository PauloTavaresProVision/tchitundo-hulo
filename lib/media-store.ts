import { mkdir, open, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_STANDARD_FILE_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"]);

export type MediaItem = {
  filename: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  source: "upload" | "website" | "brand";
  deletable: boolean;
};

function uploadsDirectory() {
  return process.env.CONTENT_UPLOADS_DIR || path.join(process.cwd(), "data", "uploads");
}

export async function saveMedia(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Formato não permitido. Use JPG, PNG, WEBP, PDF ou MP4.");
  const maximum = file.type === "video/mp4" ? MAX_VIDEO_FILE_SIZE : MAX_STANDARD_FILE_SIZE;
  if (file.size <= 0 || file.size > maximum) throw new Error(file.type === "video/mp4" ? "O vídeo deve ter no máximo 500 MB." : "O ficheiro deve ter no máximo 25 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectType(bytes);
  if (!detectedType || detectedType !== file.type) throw new Error("O conteúdo do ficheiro não corresponde ao formato declarado.");

  const prepared = await prepareMedia(bytes, detectedType);
  const filename = `${crypto.randomUUID()}${extensionFor(prepared.type)}`;
  const directory = uploadsDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), prepared.bytes, { mode: 0o600 });
  return { filename, url: `/api/media/${encodeURIComponent(filename)}`, type: prepared.type, size: prepared.bytes.byteLength };
}

async function prepareMedia(bytes: Uint8Array, type: string) {
  if (!type.startsWith("image/")) return { bytes, type };
  const { default: sharp } = await import("sharp");
  const image = sharp(bytes, { failOn: "error", limitInputPixels: 80_000_000, sequentialRead: true });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Não foi possível ler as dimensões da imagem.");
  const output = await image
    .rotate()
    .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
    .webp({ quality: metadata.hasAlpha ? 90 : 82, alphaQuality: 100, effort: 4, smartSubsample: true })
    .toBuffer();
  return { bytes: new Uint8Array(output), type: "image/webp" };
}

export async function listMedia(): Promise<MediaItem[]> {
  const uploads = await listUploadedMedia();
  const bundled = await listBundledMedia();
  return [
    ...uploads.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    ...bundled.sort((left, right) => left.url.localeCompare(right.url)),
  ];
}

async function listUploadedMedia(): Promise<MediaItem[]> {
  const directory = uploadsDirectory();
  try {
    const names = await readdir(directory);
    const items = await Promise.all(names.filter(validFilename).map(async (filename) => {
      const info = await stat(path.join(directory, filename));
      return {
        filename,
        url: `/api/media/${encodeURIComponent(filename)}`,
        type: typeFor(filename),
        size: info.size,
        createdAt: info.birthtime.toISOString(),
        source: "upload",
        deletable: true,
      } satisfies MediaItem;
    }));
    return items;
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
}

async function listBundledMedia(): Promise<MediaItem[]> {
  const root = await staticAssetsRoot();
  if (!root) return [];
  const groups = [
    { directory: "media", urlRoot: "/media", source: "website" as const },
    { directory: "documents", urlRoot: "/documents", source: "website" as const },
    { directory: "brand", urlRoot: "/brand", source: "brand" as const },
  ];
  const grouped = await Promise.all(groups.map(async (group) => {
    const directory = path.join(root, group.directory);
    try {
      const names = await readdir(directory);
      return Promise.all(names.filter(validFilename).map(async (filename) => {
        const info = await stat(path.join(directory, filename));
        return {
          filename,
          url: `${group.urlRoot}/${encodeURIComponent(filename)}`,
          type: typeFor(filename),
          size: info.size,
          createdAt: info.mtime.toISOString(),
          source: group.source,
          deletable: false,
        } satisfies MediaItem;
      }));
    } catch (error) {
      if (isMissingFile(error)) return [];
      throw error;
    }
  }));
  const ogImage = await bundledFile(root, "og.png", "/og.png", "website");
  return [...grouped.flat(), ...(ogImage ? [ogImage] : [])];
}

async function staticAssetsRoot() {
  for (const candidate of [path.join(process.cwd(), "public"), path.join(process.cwd(), "dist", "client")]) {
    try {
      if ((await stat(candidate)).isDirectory()) return candidate;
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }
  return null;
}

async function bundledFile(root: string, filename: string, url: string, source: MediaItem["source"]): Promise<MediaItem | null> {
  try {
    const info = await stat(path.join(root, filename));
    if (!info.isFile() || !validFilename(filename)) return null;
    return { filename, url, type: typeFor(filename), size: info.size, createdAt: info.mtime.toISOString(), source, deletable: false };
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

export async function deleteMedia(filename: string) {
  const safeName = assertFilename(filename);
  await unlink(path.join(uploadsDirectory(), safeName));
}

export async function readMedia(filename: string) {
  const safeName = assertFilename(filename);
  const bytes = await readFile(path.join(uploadsDirectory(), safeName));
  return { bytes, type: typeFor(safeName) };
}

export async function mediaInfo(filename: string) {
  const safeName = assertFilename(filename);
  const info = await stat(path.join(uploadsDirectory(), safeName));
  return { filename: safeName, size: info.size, type: typeFor(safeName) };
}

export async function readMediaRange(filename: string, start: number, end: number) {
  const safeName = assertFilename(filename);
  const length = Math.max(0, end - start + 1);
  const buffer = Buffer.alloc(length);
  const handle = await open(path.join(uploadsDirectory(), safeName), "r");
  try {
    const result = await handle.read(buffer, 0, length, start);
    return buffer.subarray(0, result.bytesRead);
  } finally {
    await handle.close();
  }
}

function assertFilename(filename: string) {
  const safeName = path.basename(filename);
  if (safeName !== filename || !validFilename(safeName)) throw new Error("Invalid filename");
  return safeName;
}

function validFilename(filename: string) {
  return /^[a-z0-9][a-z0-9-]{0,110}\.(jpg|png|webp|pdf|mp4)$/i.test(filename);
}

function extensionFor(type: string) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "video/mp4") return ".mp4";
  return ".pdf";
}

function typeFor(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".jpg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".mp4") return "video/mp4";
  return "application/octet-stream";
}

function detectType(bytes: Uint8Array) {
  if (matches(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && matches(bytes, [0x52, 0x49, 0x46, 0x46]) && matches(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  if (matches(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (bytes.length >= 12 && matches(bytes.slice(4), [0x66, 0x74, 0x79, 0x70])) return "video/mp4";
  return null;
}

function matches(bytes: Uint8Array, signature: number[]) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function isMissingFile(error: unknown) {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
