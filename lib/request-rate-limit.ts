import { clientAddress } from "@/lib/request-security";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function allowRequest(request: Request, scope: string, maximum: number, windowMs = 60_000) {
  const key = `${scope}:${clientAddress(request)}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    prune(now);
    return true;
  }
  current.count += 1;
  return current.count <= maximum;
}

function prune(now: number) {
  for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  if (buckets.size <= 2_000) return;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (buckets.size <= 1_500) break;
  }
}
