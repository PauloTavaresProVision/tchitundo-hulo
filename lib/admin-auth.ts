import { findUserById, type BackofficeUser, type UserRole } from "@/lib/users-store";

const SESSION_COOKIE = "sb_backoffice_session";
const CHALLENGE_COOKIE = "sb_backoffice_challenge";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const CHALLENGE_DURATION_SECONDS = 10 * 60;

export type SessionPayload = {
  userId: string;
  username: string;
  role: UserRole;
  expiresAt: number;
};

export type MfaChallengePayload = {
  userId: string;
  purpose: "mfa" | "setup";
  expiresAt: number;
};

export function adminConfigured() {
  return Boolean(process.env.BACKOFFICE_USERNAME && process.env.BACKOFFICE_PASSWORD && process.env.BACKOFFICE_SESSION_SECRET);
}

export async function createAdminSession(user: BackofficeUser) {
  return createSignedToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: now() + SESSION_DURATION_SECONDS,
  } satisfies SessionPayload);
}

export async function createMfaChallenge(userId: string, purpose: MfaChallengePayload["purpose"]) {
  return createSignedToken({ userId, purpose, expiresAt: now() + CHALLENGE_DURATION_SECONDS } satisfies MfaChallengePayload);
}

export async function readAdminSession(request: Request): Promise<SessionPayload | null> {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  const payload = await readSignedToken<SessionPayload>(token);
  if (!payload || payload.expiresAt <= now()) return null;

  const user = await findUserById(payload.userId).catch(() => null);
  if (!user || !user.active || !user.mfaEnabled || user.username !== payload.username || user.role !== payload.role) return null;
  return payload;
}

export async function readMfaChallenge(request: Request): Promise<MfaChallengePayload | null> {
  const token = readCookie(request.headers.get("cookie"), CHALLENGE_COOKIE);
  const payload = await readSignedToken<MfaChallengePayload>(token);
  if (!payload || payload.expiresAt <= now() || !["mfa", "setup"].includes(payload.purpose)) return null;
  return payload;
}

export function sessionCookie(token: string, request: Request) {
  return cookie(SESSION_COOKIE, token, SESSION_DURATION_SECONDS, request);
}

export function challengeCookie(token: string, request: Request) {
  return cookie(CHALLENGE_COOKIE, token, CHALLENGE_DURATION_SECONDS, request);
}

export function expiredSessionCookie() {
  return expiredCookie(SESSION_COOKIE);
}

export function expiredChallengeCookie() {
  return expiredCookie(CHALLENGE_COOKIE);
}

export function sameOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;

  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return false;
  }

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const host = firstForwardedValue(request.headers.get("host"));
  const requestUrl = new URL(request.url);
  const acceptedHosts = new Set([forwardedHost, host, requestUrl.host].filter(Boolean));
  const hostMatches = acceptedHosts.has(origin.host);

  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const protocolMatches = !forwardedProtocol || origin.protocol === `${forwardedProtocol}:`;
  if (hostMatches && protocolMatches) return true;
  return request.headers.get("sec-fetch-site") === "same-origin";
}

async function createSignedToken(payload: object) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${await sign(encodedPayload)}`;
}

async function readSignedToken<T>(token: string | null): Promise<T | null> {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = await sign(encodedPayload).catch(() => "");
  if (!expected || !constantTimeEqual(signature, expected)) return null;
  try {
    return JSON.parse(fromBase64Url(encodedPayload)) as T;
  } catch {
    return null;
  }
}

function cookie(name: string, value: string, maxAge: number, request: Request) {
  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const secure = forwardedProtocol === "https" || new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function expiredCookie(name: string) {
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim().toLowerCase() || "";
}

function readCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const pair of header.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

async function sign(value: string) {
  const secret = process.env.BACKOFFICE_SESSION_SECRET;
  if (!secret) throw new Error("BACKOFFICE_SESSION_SECRET is not configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function toBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return new TextDecoder().decode(Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
