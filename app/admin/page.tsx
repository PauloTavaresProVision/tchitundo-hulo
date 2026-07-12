"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AgendaItem, CampaignArchiveItem, DocumentItem, GalleryItem, SeoSettings, SiteContent } from "@/content/site-content";
import type { PublicBackofficeUser, UserRole } from "@/lib/users-store";

type Tab = "overview" | "analytics" | "agenda" | "gallery" | "documents" | "archive" | "seo" | "users";
type Notice = { type: "success" | "error"; message: string } | null;
type AuthStage = "credentials" | "password" | "mfa" | "setup";
type MfaSetup = { secret: string; uri: string; qrCode: string };

const baseTabs: Array<{ id: Tab; label: string; symbol: string }> = [
  { id: "overview", label: "Visão geral", symbol: "◫" },
  { id: "analytics", label: "Estatísticas", symbol: "◔" },
  { id: "agenda", label: "Agenda cultural", symbol: "◇" },
  { id: "gallery", label: "Galeria", symbol: "▦" },
  { id: "documents", label: "Documentos", symbol: "▤" },
  { id: "archive", label: "Campanhas", symbol: "◎" },
  { id: "seo", label: "SEO", symbol: "⌕" },
];
const usersTab = { id: "users" as Tab, label: "Utilizadores", symbol: "♙" };

export default function AdminPage() {
  const [booting, setBooting] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [authStage, setAuthStage] = useState<AuthStage>("credentials");
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const tabs = role === "admin" ? [...baseTabs, usersTab] : baseTabs;

  const loadContent = useCallback(async () => {
    const response = await fetch("/api/admin/content", { cache: "no-store" });
    if (!response.ok) {
      setAuthenticated(false);
      return;
    }
    setContent(await response.json() as SiteContent);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      const state = await response.json() as { authenticated: boolean; configured: boolean; stage?: AuthStage | "authenticated"; username?: string; role?: UserRole; setup?: MfaSetup };
      setConfigured(state.configured);
      setAuthenticated(state.authenticated);
      setUsername(state.username ?? "");
      setRole(state.role ?? "editor");
      setAuthStage(state.stage === "mfa" || state.stage === "setup" || state.stage === "password" ? state.stage : "credentials");
      setMfaSetup(state.setup ?? null);
      if (state.authenticated) await loadContent();
    } finally {
      setBooting(false);
    }
  }, [loadContent]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const result = await response.json() as { error?: string; username?: string; stage?: AuthStage; setup?: MfaSetup };
    if (!response.ok) {
      setNotice({ type: "error", message: result.error ?? "Não foi possível iniciar sessão." });
      return;
    }
    setUsername(result.username ?? String(form.get("username") ?? ""));
    setAuthStage(result.stage ?? "mfa");
    setMfaSetup(result.setup ?? null);
  }

  async function verifyMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: form.get("code") }),
    });
    const result = await response.json() as { error?: string; username?: string; role?: UserRole };
    if (!response.ok) {
      setNotice({ type: "error", message: result.error ?? "Código inválido." });
      return;
    }
    setAuthenticated(true);
    setUsername(result.username ?? username);
    setRole(result.role ?? "editor");
    setAuthStage("credentials");
    setMfaSetup(null);
    await loadContent();
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: form.get("newPassword"), confirmation: form.get("confirmation") }),
    });
    const result = await response.json() as { error?: string; username?: string; stage?: AuthStage; setup?: MfaSetup };
    if (!response.ok) {
      setNotice({ type: "error", message: result.error ?? "Não foi possível alterar a palavra-passe." });
      return;
    }
    setUsername(result.username ?? username);
    setAuthStage(result.stage ?? "mfa");
    setMfaSetup(result.setup ?? null);
    setNotice({ type: "success", message: "Palavra-passe alterada. Complete a autenticação." });
  }

  async function restartLogin() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthStage("credentials");
    setMfaSetup(null);
    setNotice(null);
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setContent(null);
    setAuthStage("credentials");
    setMfaSetup(null);
    setNotice(null);
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível guardar.");
      setNotice({ type: "success", message: "Alterações guardadas e disponíveis no website." });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível guardar." });
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File, target: string) {
    setUploading(target);
    setNotice(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/uploads", { method: "POST", body: form });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Falha no carregamento.");
      return result.url;
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Falha no carregamento." });
      return null;
    } finally {
      setUploading(null);
    }
  }

  if (booting) return <AdminLoading />;
  if (!authenticated) return <AdminLogin configured={configured} stage={authStage} setup={mfaSetup} notice={notice} onSubmit={login} onPassword={changePassword} onVerify={verifyMfa} onBack={restartLogin} />;
  if (!content) return <AdminLoading />;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/" aria-label="Abrir website">
          <img src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" />
          <span>Património cultural</span>
        </Link>
        <nav aria-label="Secções do backoffice">
          {tabs.map((tab) => (
            <button className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}>
              <i>{tab.symbol}</i><span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-user">
          <span>{username.slice(0, 1).toUpperCase()}</span>
          <div><strong>{username}</strong><small>{role === "admin" ? "Administrador" : "Editor"}</small></div>
          <button onClick={logout} aria-label="Terminar sessão">↗</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>Standard Bank Angola</p>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
          </div>
          <div className="admin-actions">
            <Link href="/" target="_blank" rel="noreferrer">Ver website ↗</Link>
            {!(["users", "analytics"] as Tab[]).includes(activeTab) && <button className="primary" onClick={save} disabled={saving}>{saving ? "A guardar…" : "Guardar alterações"}</button>}
          </div>
        </header>

        {notice && <div className={`admin-notice ${notice.type}`} role="status">{notice.message}</div>}

        <section className="admin-workspace">
          {activeTab === "overview" && <Overview content={content} onNavigate={setActiveTab} />}
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "agenda" && <AgendaEditor items={content.agenda} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "gallery" && <GalleryEditor items={content.gallery} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "documents" && <DocumentsEditor items={content.documents} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "archive" && <ArchiveEditor items={content.archive} setContent={setContent} />}
          {activeTab === "seo" && <SeoEditor seo={content.seo} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "users" && role === "admin" && <UsersEditor currentUsername={username} />}
        </section>
      </main>
    </div>
  );
}

function AdminLogin({ configured, stage, setup, notice, onSubmit, onPassword, onVerify, onBack }: { configured: boolean; stage: AuthStage; setup: MfaSetup | null; notice: Notice; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onPassword: (event: React.FormEvent<HTMLFormElement>) => void; onVerify: (event: React.FormEvent<HTMLFormElement>) => void; onBack: () => void }) {
  return (
    <main className="admin-login-page">
      <section className="admin-login-art">
        <img src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" />
        <div><p>Plataforma editorial</p><h1>Tchitundo-Hulo</h1><span>Património · Identidade · Futuro</span></div>
      </section>
      <section className="admin-login-panel">
        <form key={stage} onSubmit={stage === "credentials" ? onSubmit : stage === "password" ? onPassword : onVerify}>
          <p className="admin-kicker">Área reservada · acesso protegido</p>
          <h2>{stage === "credentials" ? "Bem-vindo ao backoffice" : stage === "password" ? "Defina uma nova palavra-passe" : stage === "setup" ? "Active a dupla autenticação" : "Confirme a sua identidade"}</h2>
          <p>{stage === "credentials" ? "Gira conteúdos, imagens, documentos e a agenda cultural da plataforma." : stage === "password" ? "Por segurança, a palavra-passe temporária tem de ser substituída antes do primeiro acesso." : stage === "setup" ? "Digitalize o QR code com o Google Authenticator ou Microsoft Authenticator e introduza o código gerado." : "Introduza o código de 6 dígitos apresentado na sua aplicação Authenticator."}</p>
          {!configured && <div className="admin-notice error">Configure BACKOFFICE_USERNAME, BACKOFFICE_PASSWORD e BACKOFFICE_SESSION_SECRET no servidor.</div>}
          {notice && <div className={`admin-notice ${notice.type}`}>{notice.message}</div>}
          {stage === "credentials" ? <>
            <label>Utilizador<input name="username" autoComplete="username" required /></label>
            <label>Palavra-passe<input name="password" type="password" autoComplete="current-password" required /></label>
            <button className="primary" type="submit" disabled={!configured}>Continuar</button>
          </> : stage === "password" ? <>
            <label>Nova palavra-passe<input name="newPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required autoFocus /></label>
            <label>Confirmar palavra-passe<input name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label>
            <button className="primary" type="submit">Alterar e continuar</button>
            <button className="login-back" type="button" onClick={onBack}>← Voltar ao login</button>
          </> : <>
            {stage === "setup" && setup && <div className="mfa-setup">
              <img src={setup.qrCode} alt="QR code para configurar a aplicação Authenticator" />
              <div><span>Chave manual</span><code>{setup.secret}</code></div>
            </div>}
            <label>Código de autenticação<input className="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required autoFocus /></label>
            <button className="primary" type="submit">{stage === "setup" ? "Activar e entrar" : "Confirmar e entrar"}</button>
            <button className="login-back" type="button" onClick={onBack}>← Voltar ao login</button>
          </>}
          <small>Palavra-passe e código Authenticator são obrigatórios. A sessão termina após 30 minutos de inactividade ou 8 horas.</small>
        </form>
      </section>
    </main>
  );
}

function AdminLoading() {
  return <main className="admin-loading"><span /><p>A preparar o backoffice…</p></main>;
}

function Overview({ content, onNavigate }: { content: SiteContent; onNavigate: (tab: Tab) => void }) {
  const cards = [
    { tab: "agenda" as Tab, value: content.agenda.length, label: "Eventos na agenda", symbol: "◇" },
    { tab: "gallery" as Tab, value: content.gallery.length, label: "Imagens na galeria", symbol: "▦" },
    { tab: "documents" as Tab, value: content.documents.length, label: "Documentos", symbol: "▤" },
    { tab: "archive" as Tab, value: content.archive.length, label: "Campanhas", symbol: "◎" },
  ];
  return (
    <div className="admin-overview">
      <div className="overview-intro"><div><p className="admin-kicker">Conteúdo centralizado</p><h2>A memória continua<br />a ser construída.</h2></div><p>Esta área controla as colecções editoriais que alimentam o website público. As alterações são publicadas assim que forem guardadas.</p></div>
      <div className="metric-grid">{cards.map((card) => <button key={card.tab} onClick={() => onNavigate(card.tab)}><i>{card.symbol}</i><strong>{String(card.value).padStart(2, "0")}</strong><span>{card.label}</span><b>→</b></button>)}</div>
      <div className="overview-panels">
        <article><p className="admin-kicker">Agenda em destaque</p><h3>{content.agenda[0]?.title ?? "Sem eventos"}</h3><span>{content.agenda[0]?.status ?? "Adicione o primeiro evento"}</span><button onClick={() => onNavigate("agenda")}>Gerir agenda →</button></article>
        <article className="overview-image" style={{ backgroundImage: `linear-gradient(0deg, rgba(2,9,23,.9), transparent), url(${content.gallery[0]?.src ?? "/media/community-rock.jpg"})` }}><p>Galeria editorial</p><strong>{content.gallery[0]?.label ?? "Tchitundo-Hulo"}</strong><button onClick={() => onNavigate("gallery")}>Editar galeria →</button></article>
      </div>
    </div>
  );
}

function AgendaEditor({ items, setContent, upload, uploading }: EditorProps<AgendaItem>) {
  const add = () => setContent((current) => current && ({ ...current, agenda: [...current.agenda, { id: uniqueId("evento"), number: String(current.agenda.length + 1).padStart(2, "0"), type: "Evento", title: "Novo evento", detail: "Descrição do evento", status: "Em preparação", image: "/media/community-rock.jpg" }] }));
  return <Collection title="Agenda cultural" description="Crie e actualize eventos, experiências e conteúdos pedagógicos." onAdd={add} addLabel="Novo evento">
    {items.map((item, index) => <EditorCard key={item.id} index={index} title={item.title} image={item.image} onDelete={() => removeItem(setContent, "agenda", index)}>
      <div className="field-row"><Field label="Número" value={item.number} onChange={(value) => updateItem(setContent, "agenda", index, "number", value)} /><Field label="Tipo" value={item.type} onChange={(value) => updateItem(setContent, "agenda", index, "type", value)} /></div>
      <Field label="Título" value={item.title} onChange={(value) => updateItem(setContent, "agenda", index, "title", value)} />
      <Field label="Descrição" value={item.detail} multiline onChange={(value) => updateItem(setContent, "agenda", index, "detail", value)} />
      <Field label="Estado ou data" value={item.status} onChange={(value) => updateItem(setContent, "agenda", index, "status", value)} />
      <UploadField label="Imagem" value={item.image} busy={uploading === `agenda-${index}`} accept="image/*" onUpload={async (file) => { const url = await upload(file, `agenda-${index}`); if (url) updateItem(setContent, "agenda", index, "image", url); }} onChange={(value) => updateItem(setContent, "agenda", index, "image", value)} />
    </EditorCard>)}
  </Collection>;
}

function GalleryEditor({ items, setContent, upload, uploading }: EditorProps<GalleryItem>) {
  const add = () => setContent((current) => current && ({ ...current, gallery: [...current.gallery, { id: uniqueId("imagem"), src: "/media/community-rock.jpg", alt: "Imagem de Tchitundo-Hulo", label: "Nova imagem", orientation: "standard" }] }));
  return <Collection title="Galeria" description="Organize as fotografias, legendas e formatos apresentados no arquivo visual." onAdd={add} addLabel="Adicionar imagem">
    <div className="gallery-admin-grid">{items.map((item, index) => <article className="gallery-admin-card" key={item.id}>
      <div className="gallery-admin-preview"><img src={item.src} alt="" /><span>{String(index + 1).padStart(2, "0")}</span><button onClick={() => removeItem(setContent, "gallery", index)} aria-label="Eliminar imagem">×</button></div>
      <Field label="Legenda" value={item.label} onChange={(value) => updateItem(setContent, "gallery", index, "label", value)} />
      <Field label="Texto alternativo" value={item.alt} onChange={(value) => updateItem(setContent, "gallery", index, "alt", value)} />
      <label className="admin-field">Formato<select value={item.orientation} onChange={(event) => updateItem(setContent, "gallery", index, "orientation", event.target.value)}><option value="wide">Horizontal</option><option value="tall">Vertical</option><option value="standard">Standard</option></select></label>
      <UploadField label="Ficheiro" value={item.src} busy={uploading === `gallery-${index}`} accept="image/*" onUpload={async (file) => { const url = await upload(file, `gallery-${index}`); if (url) updateItem(setContent, "gallery", index, "src", url); }} onChange={(value) => updateItem(setContent, "gallery", index, "src", value)} />
    </article>)}</div>
  </Collection>;
}

function DocumentsEditor({ items, setContent, upload, uploading }: EditorProps<DocumentItem>) {
  const add = () => setContent((current) => current && ({ ...current, documents: [...current.documents, { id: uniqueId("documento"), title: "Novo documento", detail: "Documento institucional", available: false }] }));
  return <Collection title="Documentos" description="Disponibilize PDFs institucionais e controle a sua visibilidade pública." onAdd={add} addLabel="Novo documento">
    {items.map((item, index) => <EditorCard key={item.id} index={index} title={item.title} onDelete={() => removeItem(setContent, "documents", index)}>
      <Field label="Título" value={item.title} onChange={(value) => updateItem(setContent, "documents", index, "title", value)} />
      <Field label="Descrição" value={item.detail} onChange={(value) => updateItem(setContent, "documents", index, "detail", value)} />
      <UploadField label="PDF" value={item.href ?? ""} busy={uploading === `document-${index}`} accept="application/pdf" onUpload={async (file) => { const url = await upload(file, `document-${index}`); if (url) updateItem(setContent, "documents", index, "href", url); }} onChange={(value) => updateItem(setContent, "documents", index, "href", value)} />
      <label className="toggle-field"><input type="checkbox" checked={item.available} onChange={(event) => updateItem(setContent, "documents", index, "available", event.target.checked)} /><span />Disponível para o público</label>
    </EditorCard>)}
  </Collection>;
}

function ArchiveEditor({ items, setContent }: Pick<EditorProps<CampaignArchiveItem>, "items" | "setContent">) {
  const add = () => setContent((current) => current && ({ ...current, archive: [...current.archive, { id: uniqueId("campanha"), year: String(new Date().getFullYear()), title: "Nova campanha", tag: "Iniciativa institucional" }] }));
  return <Collection title="Arquivo de campanhas" description="Mantenha o histórico das iniciativas institucionais e defina a campanha activa." onAdd={add} addLabel="Nova campanha">
    {items.map((item, index) => <EditorCard key={item.id} index={index} title={item.title} onDelete={() => removeItem(setContent, "archive", index)}>
      <div className="field-row"><Field label="Ano" value={item.year} onChange={(value) => updateItem(setContent, "archive", index, "year", value)} /><Field label="Categoria" value={item.tag} onChange={(value) => updateItem(setContent, "archive", index, "tag", value)} /></div>
      <Field label="Título" value={item.title} onChange={(value) => updateItem(setContent, "archive", index, "title", value)} />
      <label className="toggle-field"><input type="checkbox" checked={Boolean(item.active)} onChange={(event) => updateItem(setContent, "archive", index, "active", event.target.checked)} /><span />Campanha em destaque</label>
    </EditorCard>)}
  </Collection>;
}

type AnalyticsSummary = {
  periodDays: number;
  totals: { pageViews: number; sessions: number; averageDurationSeconds: number };
  daily: Array<{ date: string; pageViews: number; sessions: number; durationSeconds: number }>;
  sections: Array<{ id: string; totalSeconds: number; entries: number }>;
  devices: Array<{ name: "desktop" | "tablet" | "mobile"; value: number }>;
  referrers: Array<{ name: string; value: number }>;
};

function AnalyticsDashboard() {
  const [period, setPeriod] = useState(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/analytics?days=${period}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as AnalyticsSummary & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar as estatísticas.");
        if (active) setSummary(result);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar as estatísticas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);

  const maxDaily = Math.max(1, ...(summary?.daily.map((item) => item.pageViews) ?? [1]));
  const maxSection = Math.max(1, ...(summary?.sections.map((item) => item.totalSeconds) ?? [1]));
  const totalDevices = summary?.devices.reduce((sum, item) => sum + item.value, 0) ?? 0;

  return <div className="analytics-admin">
    <header className="analytics-heading">
      <div><p className="admin-kicker">Medição própria e anónima</p><h2>Desempenho do website</h2><p>Visitas, sessões e interesse por secção, sem guardar IP ou utilizar cookies publicitários.</p></div>
      <label className="admin-field">Período<select value={period} onChange={(event) => { setLoading(true); setError(""); setPeriod(Number(event.target.value)); }}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={365}>Último ano</option></select></label>
    </header>
    {error && <div className="admin-notice error">{error}</div>}
    {loading ? <div className="analytics-loading">A calcular estatísticas…</div> : summary && <>
      <div className="analytics-kpis">
        <article><span>Visualizações</span><strong>{formatNumber(summary.totals.pageViews)}</strong><small>Páginas abertas no período</small></article>
        <article><span>Sessões</span><strong>{formatNumber(summary.totals.sessions)}</strong><small>Visitas anónimas distintas</small></article>
        <article><span>Tempo médio</span><strong>{formatDuration(summary.totals.averageDurationSeconds)}</strong><small>Por sessão</small></article>
        <article><span>Secção principal</span><strong className="text-value">{sectionLabel(summary.sections[0]?.id)}</strong><small>{formatDuration(summary.sections[0]?.totalSeconds ?? 0)} de atenção</small></article>
      </div>
      <div className="analytics-layout">
        <article className="analytics-panel analytics-traffic">
          <header><div><p className="admin-kicker">Evolução</p><h3>Visualizações diárias</h3></div><span>{summary.periodDays} dias</span></header>
          <div className="analytics-bars" aria-label="Gráfico de visualizações diárias">
            {summary.daily.map((item, index) => <div className="analytics-bar-item" key={item.date} title={`${item.date}: ${item.pageViews} visualizações`}><i style={{ height: `${Math.max(item.pageViews ? 5 : 1, item.pageViews / maxDaily * 100)}%` }} /><span>{(index % Math.max(1, Math.ceil(summary.daily.length / 8)) === 0) ? item.date.slice(5).replace("-", "/") : ""}</span></div>)}
          </div>
        </article>
        <article className="analytics-panel">
          <header><div><p className="admin-kicker">Atenção</p><h3>Tempo por secção</h3></div></header>
          <div className="section-ranking">{summary.sections.length ? summary.sections.slice(0, 8).map((item) => <div key={item.id}><div><strong>{sectionLabel(item.id)}</strong><span>{formatDuration(item.totalSeconds)}</span></div><i><b style={{ width: `${item.totalSeconds / maxSection * 100}%` }} /></i></div>) : <p>Ainda não existem dados de permanência.</p>}</div>
        </article>
        <article className="analytics-panel">
          <header><div><p className="admin-kicker">Dispositivos</p><h3>Como visitam</h3></div></header>
          <div className="device-list">{summary.devices.map((item) => <div key={item.name}><strong>{deviceLabel(item.name)}</strong><span>{item.value} · {totalDevices ? Math.round(item.value / totalDevices * 100) : 0}%</span></div>)}</div>
        </article>
        <article className="analytics-panel">
          <header><div><p className="admin-kicker">Origem</p><h3>Como chegam</h3></div></header>
          <div className="referrer-list">{summary.referrers.length ? summary.referrers.map((item) => <div key={item.name}><strong>{item.name}</strong><span>{item.value}</span></div>) : <p>Ainda não existem referências externas.</p>}</div>
        </article>
      </div>
    </>}
  </div>;
}

function SeoEditor({ seo, setContent, upload, uploading }: { seo: SeoSettings; setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>; upload: (file: File, target: string) => Promise<string | null>; uploading: string | null }) {
  const update = <K extends keyof SeoSettings>(field: K, value: SeoSettings[K]) => setContent((current) => current ? ({ ...current, seo: { ...current.seo, [field]: value } }) : current);
  const titleGood = seo.title.length >= 30 && seo.title.length <= 60;
  const descriptionGood = seo.description.length >= 120 && seo.description.length <= 160;

  return <div className="seo-admin">
    <header className="seo-heading"><div><p className="admin-kicker">Visibilidade orgânica</p><h2>SEO e partilha social</h2><p>Controle o conteúdo apresentado no Google, redes sociais, sitemap e motores de pesquisa.</p></div><span className={seo.indexable ? "index-status active" : "index-status"}>{seo.indexable ? "Indexação activa" : "Indexação bloqueada"}</span></header>
    <div className="seo-layout">
      <div className="seo-fields">
        <section>
          <header><span>01</span><div><h3>Resultado de pesquisa</h3><p>Título, descrição e endereço principal da página.</p></div></header>
          <Field label={`Título SEO · ${seo.title.length}/60`} value={seo.title} onChange={(value) => update("title", value)} />
          <Field label={`Descrição · ${seo.description.length}/160`} value={seo.description} multiline onChange={(value) => update("description", value)} />
          <Field label="Palavras-chave separadas por vírgulas" value={seo.keywords} onChange={(value) => update("keywords", value)} />
          <Field label="URL canónica" value={seo.canonicalUrl} onChange={(value) => update("canonicalUrl", value)} />
        </section>
        <section>
          <header><span>02</span><div><h3>Partilha social</h3><p>Imagem utilizada no WhatsApp, LinkedIn, Facebook e outras plataformas.</p></div></header>
          {seo.ogImage && <img className="seo-social-preview" src={seo.ogImage} alt="Pré-visualização da imagem de partilha" />}
          <UploadField label="Imagem de partilha" value={seo.ogImage} busy={uploading === "seo-og-image"} accept="image/*" onUpload={async (file) => { const url = await upload(file, "seo-og-image"); if (url) update("ogImage", url); }} onChange={(value) => update("ogImage", value)} />
          <small>Formato recomendado: 1200 × 630 px, JPG ou PNG.</small>
        </section>
        <section>
          <header><span>03</span><div><h3>Indexação</h3><p>Controle a presença nos motores de pesquisa.</p></div></header>
          <label className="toggle-field seo-index-toggle"><input type="checkbox" checked={seo.indexable} onChange={(event) => update("indexable", event.target.checked)} /><span />Permitir indexação pública</label>
          <p className="seo-help">Esta opção actualiza automaticamente as instruções robots, o sitemap e as meta tags da página.</p>
        </section>
      </div>
      <aside className="seo-preview-column">
        <div className="google-preview"><p>Pré-visualização Google</p><span>{seo.canonicalUrl || "https://tchitundo-hulo.ao"}</span><h3>{seo.title || "Título da página"}</h3><div>{seo.description || "Descrição da página apresentada nos resultados de pesquisa."}</div></div>
        <div className="seo-checklist"><p className="admin-kicker">Estado SEO</p><h3>Checklist editorial</h3><ul><li className={titleGood ? "ok" : "warn"}><b>{titleGood ? "✓" : "!"}</b><span><strong>Título</strong><small>{titleGood ? "Comprimento recomendado" : "Utilize entre 30 e 60 caracteres"}</small></span></li><li className={descriptionGood ? "ok" : "warn"}><b>{descriptionGood ? "✓" : "!"}</b><span><strong>Descrição</strong><small>{descriptionGood ? "Comprimento recomendado" : "Utilize entre 120 e 160 caracteres"}</small></span></li><li className={seo.ogImage ? "ok" : "warn"}><b>{seo.ogImage ? "✓" : "!"}</b><span><strong>Imagem social</strong><small>{seo.ogImage ? "Imagem configurada" : "Adicione uma imagem de partilha"}</small></span></li><li className={seo.canonicalUrl ? "ok" : "warn"}><b>{seo.canonicalUrl ? "✓" : "!"}</b><span><strong>URL canónica</strong><small>{seo.canonicalUrl ? "Endereço configurado" : "Será utilizado o endereço actual"}</small></span></li></ul></div>
      </aside>
    </div>
  </div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-AO").format(value);
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function sectionLabel(id?: string) {
  if (!id) return "Sem dados";
  return ({ inicio: "Hero inicial", campanha: "A campanha", territorio: "O lugar", impacto: "Impacto", galeria: "Galeria", filme: "Vídeos", cultura: "Agenda cultural", documentos: "Documentos", arquivo: "Arquivo" } as Record<string, string>)[id] ?? id;
}

function deviceLabel(device: "desktop" | "tablet" | "mobile") {
  return ({ desktop: "Computador", tablet: "Tablet", mobile: "Telemóvel" })[device];
}

function UsersEditor({ currentUsername }: { currentUsername: string }) {
  const [users, setUsers] = useState<PublicBackofficeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Notice>(null);
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = await response.json() as { users?: PublicBackofficeUser[]; error?: string };
    if (!response.ok) setMessage({ type: "error", message: result.error ?? "Não foi possível carregar os utilizadores." });
    else setUsers(result.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { users?: PublicBackofficeUser[]; error?: string } }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) setMessage({ type: "error", message: result.error ?? "Não foi possível carregar os utilizadores." });
        else setUsers(result.users ?? []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), displayName: form.get("displayName"), email: form.get("email"), role: form.get("role"), password: form.get("password") }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) setMessage({ type: "error", message: result.error ?? "Não foi possível criar o utilizador." });
    else {
      formElement.reset();
      setMessage({ type: "success", message: "Utilizador criado. No primeiro acesso terá de configurar o Authenticator." });
      await loadUsers();
    }
    setCreating(false);
  }

  async function changeUser(id: string, body: Record<string, unknown>, successMessage: string) {
    setMessage(null);
    const response = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) setMessage({ type: "error", message: result.error ?? "Não foi possível actualizar o utilizador." });
    else {
      setMessage({ type: "success", message: successMessage });
      await loadUsers();
    }
  }

  async function remove(user: PublicBackofficeUser) {
    if (!window.confirm(`Eliminar permanentemente o utilizador ${user.username}?`)) return;
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json() as { error?: string };
      setMessage({ type: "error", message: result.error ?? "Não foi possível eliminar o utilizador." });
      return;
    }
    setMessage({ type: "success", message: "Utilizador eliminado." });
    await loadUsers();
  }

  return <div className="users-admin">
    <header><div><h2>Utilizadores e segurança</h2><p>Crie acessos, atribua perfis e controle a dupla autenticação.</p></div><span className="security-badge">MFA obrigatório</span></header>
    {message && <div className={`admin-notice ${message.type}`}>{message.message}</div>}
    <form className="new-user-form" onSubmit={create}>
      <div><p className="admin-kicker">Novo acesso</p><h3>Criar utilizador</h3></div>
      <label className="admin-field">Nome<input name="displayName" required /></label>
      <label className="admin-field">Utilizador<input name="username" pattern="[A-Za-z0-9._-]+" required /></label>
      <label className="admin-field">Email<input name="email" type="email" /></label>
      <label className="admin-field">Perfil<select name="role" defaultValue="editor"><option value="editor">Editor</option><option value="admin">Administrador</option></select></label>
      <label className="admin-field">Palavra-passe temporária<input name="password" type="password" minLength={12} required /></label>
      <button className="primary" disabled={creating}>{creating ? "A criar…" : "Criar utilizador"}</button>
    </form>
    <div className="users-list">
      <div className="users-list-head"><span>Utilizador</span><span>Perfil</span><span>Segurança</span><span>Estado</span><span /></div>
      {loading ? <p className="users-loading">A carregar utilizadores…</p> : users.map((user) => <article key={user.id}>
        <div className="user-identity"><i>{user.displayName.slice(0, 1).toUpperCase()}</i><div><strong>{user.displayName}</strong><span>@{user.username}{user.username === currentUsername ? " · sessão actual" : ""}</span>{user.email && <small>{user.email}</small>}</div></div>
        <select value={user.role} disabled={user.username === currentUsername} onChange={(event) => void changeUser(user.id, { role: event.target.value }, "Perfil actualizado.")}><option value="editor">Editor</option><option value="admin">Administrador</option></select>
        <div className={`mfa-status ${user.mfaEnabled ? "enabled" : "pending"}`}><b>{user.mfaEnabled ? "Protegido" : "Pendente"}</b><span>{user.mfaEnabled ? "Authenticator activo" : "Configura no próximo login"}</span></div>
        <label className="user-active"><input type="checkbox" checked={user.active} disabled={user.username === currentUsername} onChange={(event) => void changeUser(user.id, { active: event.target.checked }, event.target.checked ? "Utilizador activado." : "Utilizador desactivado.")} /><span />{user.active ? "Activo" : "Inactivo"}</label>
        <div className="user-actions"><button onClick={() => void changeUser(user.id, { resetMfa: true }, "Dupla autenticação reposta. Será configurada no próximo login.")}>Repor MFA</button><button className="danger" disabled={user.username === currentUsername} onClick={() => void remove(user)}>Eliminar</button></div>
      </article>)}
    </div>
  </div>;
}

type EditorProps<T> = {
  items: T[];
  setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>;
  upload: (file: File, target: string) => Promise<string | null>;
  uploading: string | null;
};

function Collection({ title, description, addLabel, onAdd, children }: { title: string; description: string; addLabel: string; onAdd: () => void; children: React.ReactNode }) {
  return <div className="admin-collection"><header><div><h2>{title}</h2><p>{description}</p></div><button className="secondary" onClick={onAdd}>＋ {addLabel}</button></header><div className="editor-list">{children}</div></div>;
}

function EditorCard({ index, title, image, onDelete, children }: { index: number; title: string; image?: string; onDelete: () => void; children: React.ReactNode }) {
  return <article className="editor-card">{image && <img className="editor-card-image" src={image} alt="" />}<header><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><button onClick={onDelete} aria-label={`Eliminar ${title}`}>Eliminar</button></header><div className="editor-card-fields">{children}</div></article>;
}

function Field({ label, value, multiline, onChange }: { label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  return <label className="admin-field">{label}{multiline ? <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function UploadField({ label, value, accept, busy, onChange, onUpload }: { label: string; value: string; accept: string; busy: boolean; onChange: (value: string) => void; onUpload: (file: File) => void }) {
  return <div className="upload-field"><Field label={label} value={value} onChange={onChange} /><label className="upload-button">{busy ? "A carregar…" : "Carregar ficheiro"}<input type="file" accept={accept} disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ""; }} /></label></div>;
}

type ContentCollectionKey = "portals" | "gallery" | "agenda" | "documents" | "archive";

function updateItem<K extends ContentCollectionKey>(setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>, collection: K, index: number, field: string, value: unknown) {
  setContent((current) => {
    if (!current) return current;
    const list = [...current[collection]] as Array<Record<string, unknown>>;
    list[index] = { ...list[index], [field]: value };
    return { ...current, [collection]: list } as SiteContent;
  });
}

function removeItem<K extends ContentCollectionKey>(setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>, collection: K, index: number) {
  setContent((current) => current ? ({ ...current, [collection]: current[collection].filter((_, itemIndex) => itemIndex !== index) } as SiteContent) : current);
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}
