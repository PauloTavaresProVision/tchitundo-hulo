import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function uploadsDirectory() {
  return process.env.CONTENT_UPLOADS_DIR || path.join(process.cwd(), "data", "uploads");
}

export async function saveMedia(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Formato não permitido. Use JPG, PNG, WEBP ou PDF.");
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error("O ficheiro deve ter no máximo 25 MB.");

  const extension = extensionFor(file.type);
  const base = slugify(path.parse(file.name).name) || "ficheiro";
  const filename = `${Date.now()}-${base}${extension}`;
  const directory = uploadsDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), new Uint8Array(await file.arrayBuffer()));
  return { filename, url: `/api/media/${encodeURIComponent(filename)}`, type: file.type, size: file.size };
}

export async function readMedia(filename: string) {
  const safeName = path.basename(filename);
  if (safeName !== filename) throw new Error("Invalid filename");
  const bytes = await readFile(path.join(uploadsDirectory(), safeName));
  return { bytes, type: typeFor(safeName) };
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function extensionFor(type: string) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  return ".pdf";
}

function typeFor(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}
