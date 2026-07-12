import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type Device = "desktop" | "tablet" | "mobile";

type DayStats = {
  pageViews: number;
  sessionIds: string[];
  totalDurationMs: number;
  sections: Record<string, { totalMs: number; entries: number }>;
  devices: Record<Device, number>;
  referrers: Record<string, number>;
};

type AnalyticsStore = {
  version: 1;
  days: Record<string, DayStats>;
};

export type AnalyticsSummary = {
  periodDays: number;
  totals: { pageViews: number; sessions: number; averageDurationSeconds: number };
  daily: Array<{ date: string; pageViews: number; sessions: number; durationSeconds: number }>;
  sections: Array<{ id: string; totalSeconds: number; entries: number }>;
  devices: Array<{ name: Device; value: number }>;
  referrers: Array<{ name: string; value: number }>;
};

const defaultAnalyticsPath = path.join(process.cwd(), "data", "analytics.json");
let writeQueue = Promise.resolve();

function analyticsPath() {
  return process.env.ANALYTICS_DATA_PATH || defaultAnalyticsPath;
}

function emptyDay(): DayStats {
  return {
    pageViews: 0,
    sessionIds: [],
    totalDurationMs: 0,
    sections: {},
    devices: { desktop: 0, tablet: 0, mobile: 0 },
    referrers: {},
  };
}

export async function recordVisit(input: { sessionId: string; device: string; referrer: string }) {
  const sessionId = sanitizeSessionId(input.sessionId);
  if (!sessionId) return;
  const device: Device = ["desktop", "tablet", "mobile"].includes(input.device) ? input.device as Device : "desktop";
  const referrer = sanitizeLabel(input.referrer, "Directo", 100);

  await updateStore((store) => {
    const day = store.days[today()] ?? emptyDay();
    day.pageViews += 1;
    if (!day.sessionIds.includes(sessionId)) {
      day.sessionIds.push(sessionId);
      day.devices[device] += 1;
      day.referrers[referrer] = (day.referrers[referrer] ?? 0) + 1;
    }
    store.days[today()] = day;
  });
}

export async function recordEngagement(input: { sessionId: string; totalDurationMs: number; sectionDurations: Record<string, number>; sectionEntries?: string[] }) {
  if (!sanitizeSessionId(input.sessionId)) return;
  const totalDurationMs = clampDuration(input.totalDurationMs);
  const entries = new Set((input.sectionEntries ?? []).map((item) => sanitizeSection(item)).filter(Boolean));

  await updateStore((store) => {
    const day = store.days[today()] ?? emptyDay();
    day.totalDurationMs += totalDurationMs;
    for (const [rawSection, rawDuration] of Object.entries(input.sectionDurations ?? {})) {
      const section = sanitizeSection(rawSection);
      const duration = clampDuration(rawDuration);
      if (!section || duration <= 0) continue;
      const current = day.sections[section] ?? { totalMs: 0, entries: 0 };
      current.totalMs += duration;
      if (entries.has(section)) current.entries += 1;
      day.sections[section] = current;
    }
    store.days[today()] = day;
  });
}

export async function readAnalyticsSummary(periodDays = 30): Promise<AnalyticsSummary> {
  const days = Math.min(365, Math.max(7, Math.round(periodDays || 30)));
  const store = await readStore();
  const daily = dateRange(days).map((date) => {
    const value = store.days[date] ?? emptyDay();
    return {
      date,
      pageViews: value.pageViews,
      sessions: value.sessionIds.length,
      durationSeconds: Math.round(value.totalDurationMs / 1000),
    };
  });

  const sectionTotals: Record<string, { totalMs: number; entries: number }> = {};
  const deviceTotals: Record<Device, number> = { desktop: 0, tablet: 0, mobile: 0 };
  const referrerTotals: Record<string, number> = {};
  let totalDurationMs = 0;

  for (const date of dateRange(days)) {
    const value = store.days[date];
    if (!value) continue;
    totalDurationMs += value.totalDurationMs;
    for (const device of Object.keys(deviceTotals) as Device[]) deviceTotals[device] += value.devices[device] ?? 0;
    for (const [name, count] of Object.entries(value.referrers)) referrerTotals[name] = (referrerTotals[name] ?? 0) + count;
    for (const [id, section] of Object.entries(value.sections)) {
      const current = sectionTotals[id] ?? { totalMs: 0, entries: 0 };
      current.totalMs += section.totalMs;
      current.entries += section.entries;
      sectionTotals[id] = current;
    }
  }

  const pageViews = daily.reduce((sum, item) => sum + item.pageViews, 0);
  const sessions = daily.reduce((sum, item) => sum + item.sessions, 0);
  return {
    periodDays: days,
    totals: {
      pageViews,
      sessions,
      averageDurationSeconds: sessions ? Math.round(totalDurationMs / sessions / 1000) : 0,
    },
    daily,
    sections: Object.entries(sectionTotals)
      .map(([id, value]) => ({ id, totalSeconds: Math.round(value.totalMs / 1000), entries: value.entries }))
      .sort((left, right) => right.totalSeconds - left.totalSeconds),
    devices: (Object.entries(deviceTotals) as Array<[Device, number]>).map(([name, value]) => ({ name, value })),
    referrers: Object.entries(referrerTotals).map(([name, value]) => ({ name, value })).sort((left, right) => right.value - left.value).slice(0, 10),
  };
}

async function updateStore(update: (store: AnalyticsStore) => void) {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    update(store);
    prune(store);
    const target = analyticsPath();
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  });
  await writeQueue;
}

async function readStore(): Promise<AnalyticsStore> {
  try {
    const parsed = JSON.parse(await readFile(analyticsPath(), "utf8")) as AnalyticsStore;
    return parsed?.version === 1 && parsed.days && typeof parsed.days === "object" ? parsed : { version: 1, days: {} };
  } catch (error) {
    if (isMissingFile(error)) return { version: 1, days: {} };
    throw error;
  }
}

function dateRange(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    return date.toISOString().slice(0, 10);
  });
}

function prune(store: AnalyticsStore) {
  const keep = new Set(dateRange(400));
  for (const date of Object.keys(store.days)) if (!keep.has(date)) delete store.days[date];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function clampDuration(value: number) {
  return Number.isFinite(value) ? Math.min(5 * 60 * 1000, Math.max(0, Math.round(value))) : 0;
}

function sanitizeSessionId(value: string) {
  return /^[A-Za-z0-9_-]{8,80}$/.test(value ?? "") ? value : "";
}

function sanitizeSection(value: string) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value ?? "") ? value : "";
}

function sanitizeLabel(value: string, fallback: string, maxLength: number) {
  const normalized = String(value ?? "").replace(/[\r\n\t]/g, " ").trim().slice(0, maxLength);
  return normalized || fallback;
}

function isMissingFile(error: unknown) {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
