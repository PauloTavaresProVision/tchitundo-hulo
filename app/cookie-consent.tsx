"use client";

import { useEffect, useState } from "react";
import { COOKIE_SETTINGS_EVENT, readCookiePreferences, saveCookiePreferences } from "@/lib/cookie-consent";

export default function CookieConsent({ policyUrl }: { policyUrl: string }) {
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
    {bannerOpen && <section className="cookie-banner" role="region" aria-label="Preferências de cookies">
      <div>
        <p className="cookie-kicker">A sua privacidade</p>
        <h2>Este website utiliza cookies</h2>
        <p>Utilizamos cookies estritamente necessários para o funcionamento do website. Com a sua autorização, utilizamos também dados analíticos para compreender visitas e melhorar os conteúdos.</p>
        <a href={policyUrl} target="_blank" rel="noreferrer">Consultar a política de cookies do Standard Bank ↗</a>
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-secondary" onClick={() => choose(false)}>Rejeitar opcionais</button>
        <button type="button" className="cookie-secondary" onClick={() => { setBannerOpen(false); setSettingsOpen(true); }}>Gerir preferências</button>
        <button type="button" className="cookie-primary" onClick={() => choose(true)}>Aceitar todos</button>
      </div>
    </section>}

    {settingsOpen && <div className="cookie-modal-backdrop" onClick={closeSettings}>
      <section className="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" onClick={(event) => event.stopPropagation()}>
        <button className="cookie-modal-close" type="button" onClick={closeSettings} aria-label="Fechar preferências" autoFocus>×</button>
        <p className="cookie-kicker">Centro de privacidade</p>
        <h2 id="cookie-settings-title">Gestão de cookies</h2>
        <p>Escolha os dados que autoriza. Pode alterar esta decisão a qualquer momento através do rodapé.</p>
        <div className="cookie-category">
          <div><strong>Cookies estritamente necessários</strong><span>Garantem segurança, consentimento e funcionamento essencial do website e do backoffice.</span></div>
          <label className="cookie-switch"><input type="checkbox" checked disabled /><span aria-hidden="true" /><b>Sempre ativos</b></label>
        </div>
        <div className="cookie-category">
          <div><strong>Cookies e dados analíticos</strong><span>Permitem medir visitas, dispositivo, origem e tempo aproximado nas secções, sem recolher o nome do visitante.</span></div>
          <label className="cookie-switch"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /><span aria-hidden="true" /><b>{analytics ? "Ativos" : "Inativos"}</b></label>
        </div>
        <a className="cookie-policy-link" href={policyUrl} target="_blank" rel="noreferrer">Ler a política oficial de cookies ↗</a>
        <div className="cookie-modal-actions"><button type="button" className="cookie-secondary" onClick={() => choose(false)}>Rejeitar opcionais</button><button type="button" className="cookie-primary" onClick={() => choose(analytics)}>Guardar preferências</button></div>
      </section>
    </div>}
  </>;
}
