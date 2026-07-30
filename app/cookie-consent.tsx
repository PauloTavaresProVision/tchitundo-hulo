"use client";

import { useEffect, useState } from "react";
import type { SiteLocale } from "@/content/site-content";
import { COOKIE_SETTINGS_EVENT, readCookiePreferences, saveCookiePreferences } from "@/lib/cookie-consent";

export default function CookieConsent({ policyUrl, locale }: { policyUrl: string; locale: SiteLocale }) {
  const copy = cookieCopy[locale];
  const [ready, setReady] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const initializationFrame = window.requestAnimationFrame(() => {
      const preferences = readCookiePreferences();
      setAnalytics(preferences?.analytics ?? false);
      setBannerOpen(!preferences);
      setReady(true);
    });

    const openSettings = () => {
      setAnalytics(readCookiePreferences()?.analytics ?? false);
      setBannerOpen(false);
      setSettingsOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSettingsOpen(false);
      setBannerOpen(!readCookiePreferences());
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(initializationFrame);
      window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const choose = (allowAnalytics: boolean) => {
    saveCookiePreferences(allowAnalytics);
    setAnalytics(allowAnalytics);
    setBannerOpen(false);
    setSettingsOpen(false);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    setBannerOpen(!readCookiePreferences());
  };

  if (!ready) return null;

  return <>
    {bannerOpen && <section className="cookie-banner" role="region" aria-label={copy.preferences}>
      <div>
        <p className="cookie-kicker">{copy.privacy}</p>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
        <a href={policyUrl} target="_blank" rel="noreferrer">{copy.readPolicy} ↗</a>
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-secondary" onClick={() => choose(false)}>{copy.rejectOptional}</button>
        <button type="button" className="cookie-secondary" onClick={() => { setBannerOpen(false); setSettingsOpen(true); }}>{copy.manage}</button>
        <button type="button" className="cookie-primary" onClick={() => choose(true)}>{copy.acceptAll}</button>
      </div>
    </section>}

    {settingsOpen && <div className="cookie-modal-backdrop" onClick={closeSettings}>
      <section className="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" onClick={(event) => event.stopPropagation()}>
        <button className="cookie-modal-close" type="button" onClick={closeSettings} aria-label={copy.closePreferences} autoFocus>×</button>
        <p className="cookie-kicker">{copy.privacyCentre}</p>
        <h2 id="cookie-settings-title">{copy.cookieManagement}</h2>
        <p>{copy.settingsDescription}</p>
        <div className="cookie-category">
          <div><strong>{copy.necessaryTitle}</strong><span>{copy.necessaryDescription}</span></div>
          <label className="cookie-switch"><input type="checkbox" checked disabled /><span aria-hidden="true" /><b>{copy.alwaysActive}</b></label>
        </div>
        <div className="cookie-category">
          <div><strong>{copy.analyticsTitle}</strong><span>{copy.analyticsDescription}</span></div>
          <label className="cookie-switch"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /><span aria-hidden="true" /><b>{analytics ? copy.active : copy.inactive}</b></label>
        </div>
        <a className="cookie-policy-link" href={policyUrl} target="_blank" rel="noreferrer">{copy.officialPolicy} ↗</a>
        <div className="cookie-modal-actions"><button type="button" className="cookie-secondary" onClick={() => choose(false)}>{copy.rejectOptional}</button><button type="button" className="cookie-primary" onClick={() => choose(analytics)}>{copy.savePreferences}</button></div>
      </section>
    </div>}
  </>;
}

const cookieCopy = {
  pt: {
    preferences: "Preferências de cookies",
    privacy: "A sua privacidade",
    title: "Este website utiliza cookies",
    description: "Utilizamos cookies estritamente necessários para o funcionamento do website. Com a sua autorização, utilizamos também dados analíticos para compreender visitas e melhorar os conteúdos.",
    readPolicy: "Consultar a política de cookies do Standard Bank",
    rejectOptional: "Rejeitar opcionais",
    manage: "Gerir preferências",
    acceptAll: "Aceitar todos",
    closePreferences: "Fechar preferências",
    privacyCentre: "Centro de privacidade",
    cookieManagement: "Gestão de cookies",
    settingsDescription: "Escolha os dados que autoriza. Pode alterar esta decisão a qualquer momento através do rodapé.",
    necessaryTitle: "Cookies estritamente necessários",
    necessaryDescription: "Garantem segurança, consentimento e funcionamento essencial do website e do backoffice.",
    alwaysActive: "Sempre ativos",
    analyticsTitle: "Cookies e dados analíticos",
    analyticsDescription: "Permitem medir visitas, dispositivo, origem e tempo aproximado nas secções, sem recolher o nome do visitante.",
    active: "Ativos",
    inactive: "Inativos",
    officialPolicy: "Ler a política oficial de cookies",
    savePreferences: "Guardar preferências",
  },
  en: {
    preferences: "Cookie preferences",
    privacy: "Your privacy",
    title: "This website uses cookies",
    description: "We use cookies that are strictly necessary for the website to function. With your permission, we also use anonymous analytics to understand visits and improve our content.",
    readPolicy: "View Standard Bank's cookie policy",
    rejectOptional: "Reject optional",
    manage: "Manage preferences",
    acceptAll: "Accept all",
    closePreferences: "Close preferences",
    privacyCentre: "Privacy centre",
    cookieManagement: "Cookie management",
    settingsDescription: "Choose the data you allow. You can change this decision at any time through the footer.",
    necessaryTitle: "Strictly necessary cookies",
    necessaryDescription: "These support security, consent and the essential operation of the website and backoffice.",
    alwaysActive: "Always active",
    analyticsTitle: "Analytics cookies and data",
    analyticsDescription: "These measure visits, device type, source and approximate time spent in sections without collecting the visitor's name.",
    active: "Active",
    inactive: "Inactive",
    officialPolicy: "Read the official cookie policy",
    savePreferences: "Save preferences",
  },
} as const;
