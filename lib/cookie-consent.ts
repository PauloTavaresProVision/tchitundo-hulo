export const COOKIE_CONSENT_EVENT = "tchitundo:cookie-consent-changed";
export const COOKIE_SETTINGS_EVENT = "tchitundo:open-cookie-settings";
export const ANALYTICS_SESSION_KEY = "tchitundo_analytics_session";

const STORAGE_KEY = "tchitundo_cookie_preferences_v1";
const COOKIE_NAME = "tchitundo_cookie_consent";
const CONSENT_VERSION = 1;
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type CookiePreferences = {
  version: number;
  analytics: boolean;
  updatedAt: string;
};

export function readCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<CookiePreferences>;
      if (parsed.version === CONSENT_VERSION && typeof parsed.analytics === "boolean") {
        return { version: CONSENT_VERSION, analytics: parsed.analytics, updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "" };
      }
    }
  } catch {
    // The first-party consent cookie remains available when storage is blocked.
  }

  const cookieValue = document.cookie.split("; ").find((item) => item.startsWith(`${COOKIE_NAME}=`))?.split("=")[1];
  if (cookieValue === "analytics" || cookieValue === "essential") {
    return { version: CONSENT_VERSION, analytics: cookieValue === "analytics", updatedAt: "" };
  }
  return null;
}

export function saveCookiePreferences(analytics: boolean) {
  if (typeof window === "undefined") return;
  const preferences: CookiePreferences = { version: CONSENT_VERSION, analytics, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Consent is also persisted in the strictly necessary first-party cookie.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${analytics ? "analytics" : "essential"}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  if (!analytics) clearAnalyticsSession();
  window.dispatchEvent(new CustomEvent<CookiePreferences>(COOKIE_CONSENT_EVENT, { detail: preferences }));
}

export function clearAnalyticsSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ANALYTICS_SESSION_KEY);
  } catch {
    // Session storage can be unavailable in privacy-restricted browsers.
  }
}

export function openCookieSettings() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}
