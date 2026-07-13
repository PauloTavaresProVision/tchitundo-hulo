import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { clientAddress } from "@/lib/request-security";

type AuditInput = {
  action: string;
  outcome: "success" | "failure";
  request: Request;
  userId?: string;
  username?: string;
  target?: string;
  detail?: Record<string, string | number | boolean | null>;
};

let writeQueue: Promise<unknown> = Promise.resolve();

export async function recordAudit(input: AuditInput) {
  const entry = {
    timestamp: new Date().toISOString(),
    action: input.action.slice(0, 80),
    outcome: input.outcome,
    userId: input.userId?.slice(0, 80) ?? null,
    username: input.username?.slice(0, 80) ?? null,
    target: input.target?.slice(0, 160) ?? null,
    source: clientAddress(input.request).slice(0, 100),
    userAgent: (input.request.headers.get("user-agent") ?? "").slice(0, 300),
    detail: input.detail ?? {},
  };
  const operation = writeQueue.then(async () => {
    const target = process.env.BACKOFFICE_AUDIT_PATH || path.join(process.cwd(), "data", "audit.jsonl");
    await mkdir(path.dirname(target), { recursive: true });
    await appendFile(target, `${JSON.stringify(entry)}\n`, { encoding: "utf8", mode: 0o600 });
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  await operation.catch(() => undefined);
}

export async function readAuditEntries(limit = 250) {
  const target = process.env.BACKOFFICE_AUDIT_PATH || path.join(process.cwd(), "data", "audit.jsonl");
  try {
    const raw = await readFile(target, "utf8");
    return raw.split(/\r?\n/).filter(Boolean).slice(-Math.min(1_000, Math.max(1, limit))).reverse().flatMap((line) => {
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        return [];
      }
    });
  } catch (error) {
    if (error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}
