import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredSession = {
  tokenHash: string;
  userId: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
};

const ABSOLUTE_SECONDS = 8 * 60 * 60;
const IDLE_SECONDS = 30 * 60;
const TOUCH_SECONDS = 60;
let writeQueue: Promise<unknown> = Promise.resolve();

function sessionsPath() {
  return process.env.BACKOFFICE_SESSIONS_PATH || path.join(process.cwd(), "data", "sessions.json");
}

export async function createStoredSession(userId: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64Url(bytes);
  const now = epoch();
  await mutateSessions(async (sessions) => {
    sessions.push({ tokenHash: await hashToken(token), userId, createdAt: now, lastSeenAt: now, expiresAt: now + ABSOLUTE_SECONDS });
  });
  return token;
}

export async function readStoredSession(token: string | null) {
  if (!token || token.length > 128) return null;
  const hash = await hashToken(token);
  const sessions = await readSessions();
  const session = sessions.find((item) => constantTimeEqual(item.tokenHash, hash));
  const now = epoch();
  if (!session || session.expiresAt <= now || session.lastSeenAt + IDLE_SECONDS <= now) {
    if (session) await revokeStoredSession(token);
    return null;
  }
  if (session.lastSeenAt + TOUCH_SECONDS <= now) {
    await mutateSessions((items) => {
      const current = items.find((item) => constantTimeEqual(item.tokenHash, hash));
      if (current) current.lastSeenAt = now;
    });
    session.lastSeenAt = now;
  }
  return session;
}

export async function revokeStoredSession(token: string | null) {
  if (!token) return;
  const hash = await hashToken(token);
  await mutateSessions((sessions) => {
    const index = sessions.findIndex((item) => constantTimeEqual(item.tokenHash, hash));
    if (index >= 0) sessions.splice(index, 1);
  });
}

export async function revokeUserSessions(userId: string) {
  await mutateSessions((sessions) => {
    for (let index = sessions.length - 1; index >= 0; index -= 1) if (sessions[index].userId === userId) sessions.splice(index, 1);
  });
}

async function readSessions(): Promise<StoredSession[]> {
  try {
    const parsed = JSON.parse(await readFile(sessionsPath(), "utf8")) as StoredSession[];
    return Array.isArray(parsed) ? parsed.filter(validSession) : [];
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
}

async function mutateSessions(mutation: (sessions: StoredSession[]) => void | Promise<void>) {
  const operation = writeQueue.then(async () => {
    const sessions = (await readSessions()).filter((session) => session.expiresAt > epoch() && session.lastSeenAt + IDLE_SECONDS > epoch());
    await mutation(sessions);
    const target = sessionsPath();
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(sessions, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, target);
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  await operation;
}

function validSession(value: unknown): value is StoredSession {
  return Boolean(value) && typeof value === "object"
    && typeof (value as StoredSession).tokenHash === "string"
    && typeof (value as StoredSession).userId === "string"
    && Number.isFinite((value as StoredSession).createdAt)
    && Number.isFinite((value as StoredSession).lastSeenAt)
    && Number.isFinite((value as StoredSession).expiresAt);
}

async function hashToken(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return bytesToBase64Url(digest);
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function epoch() { return Math.floor(Date.now() / 1000); }
function isMissingFile(error: unknown) { return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT"; }
