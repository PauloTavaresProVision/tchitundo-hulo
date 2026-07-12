import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function uploadsDirectory() {
  return process.env.CONTENT_UPLOADS_DIR || path.join(process.cwd(), "data", "uploads");
}

export async function saveMedia(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Formato não permitido. Use JPG, PNG, WEBP ou PDF.");
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error("O ficheiro deve ter no máximo 25 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectType(bytes);
  if (!detectedType || detectedType !== file.type) throw new Error("O conteúdo do ficheiro não corresponde ao formato declarado.");

  const filename = `${crypto.randomUUID()}${extensionFor(detectedType)}`;
  const directory = uploadsDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes, { mode: 0o600 });
  return { filename, url: `/api/media/${encodeURIComponent(filename)}`, type: detectedType, size: file.size };
}

export async function readMedia(filename: string) {
  const safeName = path.basename(filename);
  if (safeName !== filename || !/^[a-z0-9][a-z0-9-]{0,110}\.(jpg|png|webp|pdf)$/i.test(safeName)) throw new Error("Invalid filename");
  const bytes = await readFile(path.join(uploadsDirectory(), safeName));
  return { bytes, type: typeFor(safeName) };
}

function extensionFor(type: string) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  return ".pdf";
}

function typeFor(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".jpg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function detectType(bytes: Uint8Array) {
  if (matches(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && matches(bytes, [0x52, 0x49, 0x46, 0x46]) && matches(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  if (matches(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

function matches(bytes: Uint8Array, signature: number[]) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}
