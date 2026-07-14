"use client";

import { useEffect } from "react";
import { ANALYTICS_SESSION_KEY, COOKIE_CONSENT_EVENT, clearAnalyticsSession, readCookiePreferences } from "@/lib/cookie-consent";

const FLUSH_INTERVAL = 20_000;

export default function AnalyticsTracker() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/preview")) return;

    let stopTracking: ((flushOnStop: boolean) => void) | null = null;
    const syncConsent = () => {
      const enabled = readCookiePreferences()?.analytics === true;
      if (enabled && !stopTracking) stopTracking = startTracking();
      if (!enabled && stopTracking) {
        stopTracking(false);
        stopTracking = null;
        clearAnalyticsSession();
      }
    };

    syncConsent();
    window.addEventListener(COOKIE_CONSENT_EVENT, syncConsent);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, syncConsent);
      stopTracking?.(true);
    };
  }, []);

  return null;
}

function startTracking() {
    const sessionId = getSessionId();
    const visible = new Map<string, number>();
    const pending: Record<string, number> = {};
    const entered = new Set<string>();
    let lastFlush = performance.now();
    let paused = false;

    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, device: deviceType(), referrer: referrerHost() }),
      keepalive: true,
    });

    const observer = new IntersectionObserver((entries) => {
      const now = performance.now();
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id;
        if (!id) continue;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
          if (!visible.has(id)) {
            visible.set(id, now);
            entered.add(id);
          }
        } else {
          const startedAt = visible.get(id);
          if (startedAt !== undefined) pending[id] = (pending[id] ?? 0) + now - startedAt;
          visible.delete(id);
        }
      }
    }, { threshold: [0, 0.25, 0.5, 0.75] });

    document.querySelectorAll<HTMLElement>("main section[id], main footer[id]").forEach((section) => observer.observe(section));

    function snapshot(now: number) {
      for (const [id, startedAt] of visible) {
        pending[id] = (pending[id] ?? 0) + now - startedAt;
        visible.set(id, now);
      }
      const payload = {
        sessionId,
        totalDurationMs: Math.max(0, now - lastFlush),
        sectionDurations: { ...pending },
        sectionEntries: [...entered],
      };
      lastFlush = now;
      for (const key of Object.keys(pending)) delete pending[key];
      entered.clear();
      return payload;
    }

    function flush(beacon = false) {
      if (readCookiePreferences()?.analytics !== true) return;
      const payload = snapshot(performance.now());
      if (payload.totalDurationMs < 500 && Object.keys(payload.sectionDurations).length === 0) return;
      const body = JSON.stringify(payload);
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/engagement", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/analytics/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
      }
    }

    const timer = window.setInterval(() => { if (!paused) flush(); }, FLUSH_INTERVAL);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush(true);
        paused = true;
      } else {
        const now = performance.now();
        paused = false;
        lastFlush = now;
        for (const id of visible.keys()) visible.set(id, now);
      }
    };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return (flushOnStop = true) => {
      window.clearInterval(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (flushOnStop && !paused) flush(true);
    };
}

function getSessionId() {
  try {
    const current = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (current) return current;
    const next = crypto.randomUUID().replace(/-/g, "");
    sessionStorage.setItem(ANALYTICS_SESSION_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

function deviceType() {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

function referrerHost() {
  if (!document.referrer) return "Directo";
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin ? "Directo" : referrer.hostname;
  } catch {
    return "Directo";
  }
}
