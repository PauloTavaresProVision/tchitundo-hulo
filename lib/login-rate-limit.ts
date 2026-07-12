const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

export function loginKey(request: Request, username: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return `${forwarded || "local"}:${username.trim().toLowerCase()}`;
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
  const current = attempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return;
  }
  current.count += 1;
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
