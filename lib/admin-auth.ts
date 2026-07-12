const COOKIE_NAME = "sb_backoffice_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

type SessionPayload = {
  username: string;
  expiresAt: number;
};

export function adminConfig() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const username = process.env.BACKOFFICE_USERNAME || (isDevelopment ? "admin" : "");
  const password = process.env.BACKOFFICE_PASSWORD || (isDevelopment ? "admin" : "");
  const secret = process.env.BACKOFFICE_SESSION_SECRET || (isDevelopment ? "tchitundo-hulo-local-development" : "");

  return username && password && secret ? { username, password, secret } : null;
}

export async function createAdminSession(username: string) {
  const config = adminConfig();
  if (!config) throw new Error("Backoffice credentials are not configured");

  const payload: SessionPayload = {
    username,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload, config.secret);
  return `${encodedPayload}.${signature}`;
}

export async function readAdminSession(request: Request): Promise<SessionPayload | null> {
  const config = adminConfig();
  if (!config) return null;
  const token = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = await sign(encodedPayload, config.secret);
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;
    if (payload.username !== config.username || payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function validCredentials(username: string, password: string) {
  const config = adminConfig();
  if (!config) return false;
  return constantTimeEqual(username, config.username) && constantTimeEqual(password, config.password);
}

export function sessionCookie(token: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}${secure}`;
}

export function expiredSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
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

  // Browsers control this header, making it a reliable fallback when a reverse
  // proxy does not preserve the public host on the internal request URL.
  return request.headers.get("sec-fetch-site") === "same-origin";
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

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function toBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
