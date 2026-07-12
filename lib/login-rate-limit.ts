import { clientAddress } from "@/lib/request-security";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

export function loginKey(request: Request, username: string) {
  return `${clientAddress(request)}:${username.trim().toLowerCase().slice(0, 64)}`;
}

export function canAttemptLogin(key: string) {
  const entry = attempts.get(key);
  if (!entry) return true;
  if (entry.resetAt <= Date.now()) {
    attempts.delete(key);
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

export function recordLoginFailure(key: string) {
  pruneAttempts();
  const current = attempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return;
  }
  current.count += 1;
}

function pruneAttempts() {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
  if (attempts.size < 5_000) return;
  for (const key of attempts.keys()) {
    attempts.delete(key);
    if (attempts.size < 4_000) break;
  }
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
