"use client";

import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AgendaItem, CampaignArchiveItem, DocumentItem, GalleryItem, SeoSettings, SiteContent } from "@/content/site-content";
import { optimizedMediaUrl } from "@/lib/optimized-media";
import type { PublicBackofficeUser, UserRole } from "@/lib/users-store";

type Tab = "overview" | "website" | "analytics" | "agenda" | "gallery" | "video" | "documents" | "archive" | "media" | "history" | "seo" | "users" | "audit";
type Notice = { type: "success" | "error"; message: string } | null;
type AuthStage = "credentials" | "password" | "mfa" | "setup";
type MfaSetup = { secret: string; uri: string; qrCode: string };

const baseTabs: Array<{ id: Tab; label: string; symbol: string }> = [
  { id: "overview", label: "Visão geral", symbol: "◫" },
  { id: "website", label: "Website", symbol: "▣" },
  { id: "agenda", label: "Agenda cultural", symbol: "◇" },
  { id: "gallery", label: "Galeria", symbol: "▦" },
  { id: "video", label: "Vídeo", symbol: "▷" },
  { id: "documents", label: "Documentos", symbol: "▤" },
  { id: "archive", label: "Campanhas", symbol: "◎" },
  { id: "media", label: "Ficheiros", symbol: "▧" },
  { id: "history", label: "Histórico", symbol: "↶" },
  { id: "analytics", label: "Estatísticas", symbol: "◔" },
  { id: "seo", label: "SEO", symbol: "⌕" },
];
const usersTab = { id: "users" as Tab, label: "Utilizadores", symbol: "♙" };
const auditTab = { id: "audit" as Tab, label: "Auditoria", symbol: "≡" };

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
  const tabs = role === "admin" ? [...baseTabs, usersTab, auditTab] : baseTabs;

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

  async function saveDraft(showNotice = true) {
    if (!content) return;
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const result = await response.json() as { error?: string; content?: SiteContent };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível guardar.");
      if (result.content) setContent(result.content);
      if (showNotice) setNotice({ type: "success", message: "Rascunho guardado. Publique quando estiver pronto." });
      return true;
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível guardar." });
      return false;
    }
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    await saveDraft();
    setSaving(false);
  }

  async function publish() {
    if (!content) return;
    setSaving(true);
    setNotice(null);
    try {
      if (!await saveDraft(false)) return;
      const response = await fetch("/api/admin/content/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish" }) });
      const result = await response.json() as { error?: string; content?: SiteContent };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível publicar.");
      if (result.content) setContent(result.content);
      setNotice({ type: "success", message: "Conteúdo publicado no website." });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível publicar." });
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
          <ManagedImage src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" width={1717} height={456} sizes="172px" priority />
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
            <Link href="/" target="_blank" rel="noreferrer">Ver publicado ↗</Link>
            <Link href="/preview" target="_blank" rel="noreferrer">Pré-visualizar ↗</Link>
            {!(["overview", "users", "audit", "media", "history", "analytics"] as Tab[]).includes(activeTab) && <><button className="secondary" onClick={save} disabled={saving}>{saving ? "A guardar…" : "Guardar rascunho"}</button><button className="primary" onClick={publish} disabled={saving}>Publicar</button></>}
          </div>
        </header>

        {notice && <div className={`admin-notice ${notice.type}`} role="status">{notice.message}</div>}

        <section className="admin-workspace">
          {activeTab === "overview" && <Overview content={content} onNavigate={setActiveTab} />}
          {activeTab === "website" && <WebsiteEditor content={content} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "agenda" && <AgendaEditor items={content.agenda} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "gallery" && <GalleryEditor items={content.gallery} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "video" && <VideoEditor content={content} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "documents" && <DocumentsEditor items={content.documents} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "archive" && <ArchiveEditor items={content.archive} setContent={setContent} />}
          {activeTab === "media" && <MediaLibrary role={role} />}
          {activeTab === "history" && <HistoryEditor setContent={setContent} setNotice={setNotice} />}
          {activeTab === "seo" && <SeoEditor seo={content.seo} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "users" && role === "admin" && <UsersEditor currentUsername={username} />}
          {activeTab === "audit" && role === "admin" && <AuditViewer />}
        </section>
      </main>
    </div>
  );
}

function AdminLogin({ configured, stage, setup, notice, onSubmit, onPassword, onVerify, onBack }: { configured: boolean; stage: AuthStage; setup: MfaSetup | null; notice: Notice; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onPassword: (event: React.FormEvent<HTMLFormElement>) => void; onVerify: (event: React.FormEvent<HTMLFormElement>) => void; onBack: () => void }) {
  return (
    <main className="admin-login-page">
      <section className="admin-login-art">
        <ManagedImage src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" width={1717} height={456} sizes="190px" priority />
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
              <ManagedImage src={setup.qrCode} alt="QR code para configurar a aplicação Authenticator" width={220} height={220} sizes="220px" />
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
      <div className="overview-intro"><div><p className="admin-kicker">Conteúdo centralizado</p><h2>A memória continua<br />a ser construída.</h2></div><p>Esta área controla as colecções editoriais que alimentam o website público. As alterações ficam em rascunho até escolher Publicar.</p></div>
      <div className="metric-grid">{cards.map((card) => <button key={card.tab} onClick={() => onNavigate(card.tab)}><i>{card.symbol}</i><strong>{String(card.value).padStart(2, "0")}</strong><span>{card.label}</span><b>→</b></button>)}</div>
      <div className="overview-panels">
        <article><p className="admin-kicker">Agenda em destaque</p><h3>{content.agenda[0]?.title ?? "Sem eventos"}</h3><span>{content.agenda[0]?.status ?? "Adicione o primeiro evento"}</span><button onClick={() => onNavigate("agenda")}>Gerir agenda →</button></article>
        <article className="overview-image" style={{ backgroundImage: `linear-gradient(0deg, rgba(2,9,23,.9), transparent), url(${content.gallery[0]?.src ?? "/media/community-rock.jpg"})` }}><p>Galeria editorial</p><strong>{content.gallery[0]?.label ?? "Tchitundo-Hulo"}</strong><button onClick={() => onNavigate("gallery")}>Editar galeria →</button></article>
      </div>
    </div>
  );
}

function WebsiteEditor({ content, setContent, upload, uploading }: { content: SiteContent; setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>; upload: (file: File, target: string) => Promise<string | null>; uploading: string | null }) {
  const updateSection = (section: keyof SiteContent["editorial"], field: string, value: string) => setContent((current) => current ? ({ ...current, editorial: { ...current.editorial, [section]: { ...current.editorial[section], [field]: value } } }) : current);
  const updateLegal = (field: keyof SiteContent["legal"], value: string) => setContent((current) => current ? ({ ...current, legal: { ...current.legal, [field]: value } }) : current);
  const updatePortal = (index: number, label: string) => setContent((current) => current ? ({ ...current, portals: current.portals.map((item, itemIndex) => itemIndex === index ? { ...item, label } : item) }) : current);
  const imageUpload = async (section: keyof SiteContent["editorial"], field: string, target: string, file: File) => {
    const url = await upload(file, target);
    if (url) updateSection(section, field, url);
  };

  return <div className="admin-collection website-editor">
    <header><div><h2>Conteúdo do website</h2><p>Edite os textos, imagens e ligações institucionais sem alterar o design.</p></div></header>
    <div className="website-editor-grid">
      <EditorialPanel number="01" title="Hero inicial">
        <Field label="Linha institucional" value={content.editorial.hero.eyebrow} onChange={(value) => updateSection("hero", "eyebrow", value)} />
        <Field label="Mensagem" value={content.editorial.hero.lead} onChange={(value) => updateSection("hero", "lead", value)} />
        <Field label="Botão" value={content.editorial.hero.ctaLabel} onChange={(value) => updateSection("hero", "ctaLabel", value)} />
        <UploadField label="Fotografia de fundo" value={content.editorial.hero.backgroundImage} busy={uploading === "hero-background"} accept="image/*" onUpload={(file) => void imageUpload("hero", "backgroundImage", "hero-background", file)} onChange={(value) => updateSection("hero", "backgroundImage", value)} />
        <UploadField label="Lettering Tchitundo-Hulo" value={content.editorial.hero.titleImage} busy={uploading === "hero-lettering"} accept="image/*" onUpload={(file) => void imageUpload("hero", "titleImage", "hero-lettering", file)} onChange={(value) => updateSection("hero", "titleImage", value)} />
        <div className="field-row">{content.portals.map((portal, index) => <Field key={portal.id} label={`Entrada ${index + 1}`} value={portal.label} onChange={(value) => updatePortal(index, value)} />)}</div>
      </EditorialPanel>

      <EditorialPanel number="02" title="A campanha">
        <Field label="Título" value={content.editorial.campaign.title} multiline onChange={(value) => updateSection("campaign", "title", value)} />
        <Field label="Introdução" value={content.editorial.campaign.intro} multiline onChange={(value) => updateSection("campaign", "intro", value)} />
        <Field label="Texto" value={content.editorial.campaign.body} multiline onChange={(value) => updateSection("campaign", "body", value)} />
        <div className="field-row"><Field label="Botão" value={content.editorial.campaign.ctaLabel} onChange={(value) => updateSection("campaign", "ctaLabel", value)} /><Field label="Localização" value={content.editorial.campaign.location} onChange={(value) => updateSection("campaign", "location", value)} /></div>
        <Field label="Descrição acessível da imagem" value={content.editorial.campaign.imageAlt} onChange={(value) => updateSection("campaign", "imageAlt", value)} />
        <UploadField label="Imagem" value={content.editorial.campaign.image} busy={uploading === "campaign-image"} accept="image/*" onUpload={(file) => void imageUpload("campaign", "image", "campaign-image", file)} onChange={(value) => updateSection("campaign", "image", value)} />
      </EditorialPanel>

      <EditorialPanel number="03" title="O lugar">
        <Field label="Título" value={content.editorial.territory.title} multiline onChange={(value) => updateSection("territory", "title", value)} />
        <Field label="Introdução" value={content.editorial.territory.intro} multiline onChange={(value) => updateSection("territory", "intro", value)} />
        <UploadField label="Imagem" value={content.editorial.territory.image} busy={uploading === "territory-image"} accept="image/*" onUpload={(file) => void imageUpload("territory", "image", "territory-image", file)} onChange={(value) => updateSection("territory", "image", value)} />
        <Field label="Descrição acessível da imagem" value={content.editorial.territory.imageAlt} onChange={(value) => updateSection("territory", "imageAlt", value)} />
        <div className="field-row"><Field label="Marcador 1" value={content.editorial.territory.markerOne} onChange={(value) => updateSection("territory", "markerOne", value)} /><Field label="Marcador 2" value={content.editorial.territory.markerTwo} onChange={(value) => updateSection("territory", "markerTwo", value)} /></div>
        <Field label="Núcleo 1" value={content.editorial.territory.noteOneTitle} onChange={(value) => updateSection("territory", "noteOneTitle", value)} /><Field label="Descrição 1" value={content.editorial.territory.noteOneBody} multiline onChange={(value) => updateSection("territory", "noteOneBody", value)} />
        <Field label="Núcleo 2" value={content.editorial.territory.noteTwoTitle} onChange={(value) => updateSection("territory", "noteTwoTitle", value)} /><Field label="Descrição 2" value={content.editorial.territory.noteTwoBody} multiline onChange={(value) => updateSection("territory", "noteTwoBody", value)} />
      </EditorialPanel>

      <EditorialPanel number="04" title="Impacto e preservação">
        <Field label="Citação" value={content.editorial.impact.quote} multiline onChange={(value) => updateSection("impact", "quote", value)} /><Field label="Assinatura" value={content.editorial.impact.attribution} onChange={(value) => updateSection("impact", "attribution", value)} />
        <UploadField label="Imagem de fundo" value={content.editorial.impact.backgroundImage} busy={uploading === "impact-background"} accept="image/*" onUpload={(file) => void imageUpload("impact", "backgroundImage", "impact-background", file)} onChange={(value) => updateSection("impact", "backgroundImage", value)} />
      </EditorialPanel>

      <EditorialPanel number="05" title="Títulos editoriais">
        <Field label="Título da galeria" value={content.editorial.gallery.title} multiline onChange={(value) => updateSection("gallery", "title", value)} /><Field label="Descrição da galeria" value={content.editorial.gallery.description} multiline onChange={(value) => updateSection("gallery", "description", value)} />
        <Field label="Título da agenda" value={content.editorial.culture.title} multiline onChange={(value) => updateSection("culture", "title", value)} /><Field label="Descrição da agenda" value={content.editorial.culture.description} multiline onChange={(value) => updateSection("culture", "description", value)} /><Field label="Estado da agenda" value={content.editorial.culture.status} onChange={(value) => updateSection("culture", "status", value)} />
        <Field label="Título dos documentos" value={content.editorial.documents.title} multiline onChange={(value) => updateSection("documents", "title", value)} />
        <Field label="Título do arquivo" value={content.editorial.archive.title} multiline onChange={(value) => updateSection("archive", "title", value)} /><Field label="Descrição do arquivo" value={content.editorial.archive.description} multiline onChange={(value) => updateSection("archive", "description", value)} />
      </EditorialPanel>

      <EditorialPanel number="06" title="Fecho e rodapé">
        <Field label="Título final" value={content.editorial.closing.title} multiline onChange={(value) => updateSection("closing", "title", value)} /><Field label="Mensagem final" value={content.editorial.closing.description} multiline onChange={(value) => updateSection("closing", "description", value)} />
        <UploadField label="Imagem final" value={content.editorial.closing.backgroundImage} busy={uploading === "closing-background"} accept="image/*" onUpload={(file) => void imageUpload("closing", "backgroundImage", "closing-background", file)} onChange={(value) => updateSection("closing", "backgroundImage", value)} />
        <div className="field-row"><Field label="Copyright" value={content.legal.copyright} onChange={(value) => updateLegal("copyright", value)} /><Field label="Assinatura" value={content.legal.strapline} onChange={(value) => updateLegal("strapline", value)} /></div>
        <Field label="Identificação legal do Banco" value={content.legal.corporateNotice} multiline onChange={(value) => updateLegal("corporateNotice", value)} />
        <div className="field-row"><Field label="Nome da gestão de cookies" value={content.legal.cookiesLabel} onChange={(value) => updateLegal("cookiesLabel", value)} /><Field label="URL da política de cookies" value={content.legal.cookiesUrl} onChange={(value) => updateLegal("cookiesUrl", value)} /></div>
        <div className="field-row"><Field label="Nome da privacidade" value={content.legal.privacyLabel} onChange={(value) => updateLegal("privacyLabel", value)} /><Field label="URL da privacidade" value={content.legal.privacyUrl} onChange={(value) => updateLegal("privacyUrl", value)} /></div>
        <div className="field-row"><Field label="Nome dos termos" value={content.legal.termsLabel} onChange={(value) => updateLegal("termsLabel", value)} /><Field label="URL dos termos" value={content.legal.termsUrl} onChange={(value) => updateLegal("termsUrl", value)} /></div>
      </EditorialPanel>
    </div>
  </div>;
}

function EditorialPanel({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="editorial-panel"><header><span>{number}</span><h3>{title}</h3></header><div>{children}</div></section>;
}

function VideoEditor({ content, setContent, upload, uploading }: { content: SiteContent; setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>; upload: (file: File, target: string) => Promise<string | null>; uploading: string | null }) {
  const update = <K extends keyof SiteContent["video"]>(field: K, value: SiteContent["video"][K]) => setContent((current) => current ? ({ ...current, video: { ...current.video, [field]: value } }) : current);
  return <div className="admin-collection video-editor">
    <header><div><h2>Vídeo da campanha</h2><p>O módulo fica em preparação até carregar o filme e activar a publicação.</p></div><span className={`video-state ${content.video.enabled && content.video.src ? "ready" : "pending"}`}>{content.video.enabled && content.video.src ? "Pronto" : "Em preparação"}</span></header>
    <div className="editorial-panel"><div>
      <Field label="Título" value={content.video.title} multiline onChange={(value) => update("title", value)} /><Field label="Descrição" value={content.video.description} multiline onChange={(value) => update("description", value)} />
      <div className="field-row"><Field label="Botão" value={content.video.buttonLabel} onChange={(value) => update("buttonLabel", value)} /><Field label="Estado" value={content.video.status} onChange={(value) => update("status", value)} /></div>
      <div className="field-row"><Field label="Tipo" value={content.video.type} onChange={(value) => update("type", value)} /><Field label="Idioma" value={content.video.language} onChange={(value) => update("language", value)} /></div>
      <UploadField label="Imagem de capa" value={content.video.poster} busy={uploading === "video-poster"} accept="image/*" onUpload={async (file) => { const url = await upload(file, "video-poster"); if (url) update("poster", url); }} onChange={(value) => update("poster", value)} />
      <UploadField label="Ficheiro MP4 ou URL" value={content.video.src} busy={uploading === "campaign-video"} accept="video/mp4" onUpload={async (file) => { const url = await upload(file, "campaign-video"); if (url) update("src", url); }} onChange={(value) => update("src", value)} />
      <label className="toggle-field"><input type="checkbox" checked={content.video.enabled} disabled={!content.video.src} onChange={(event) => update("enabled", event.target.checked)} /><span />Disponibilizar o vídeo no website</label>
      {!content.video.src && <p className="admin-help">Pode guardar e publicar esta secção sem vídeo. Quando receber o ficheiro, carregue-o aqui e active a opção.</p>}
    </div></div>
  </div>;
}

function AgendaEditor({ items, setContent, upload, uploading }: EditorProps<AgendaItem>) {
  const add = () => setContent((current) => current && ({ ...current, agenda: [...current.agenda, { id: uniqueId("evento"), number: String(current.agenda.length + 1).padStart(2, "0"), type: "Evento", title: "Novo evento", detail: "Descrição do evento", status: "Em preparação", image: "/media/community-rock.jpg" }] }));
  return <Collection title="Agenda cultural" description="Crie e actualize eventos, experiências e conteúdos pedagógicos." onAdd={add} addLabel="Novo evento">
    {items.map((item, index) => <EditorCard key={item.id} index={index} title={item.title} image={item.image} onDelete={() => removeItem(setContent, "agenda", index)} onMoveUp={index > 0 ? () => moveItem(setContent, "agenda", index, -1) : undefined} onMoveDown={index < items.length - 1 ? () => moveItem(setContent, "agenda", index, 1) : undefined}>
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
      <div className="gallery-admin-preview"><ManagedImage src={item.src} alt="" fill sizes="(max-width: 1050px) calc(100vw - 260px), 42vw" /><span>{String(index + 1).padStart(2, "0")}</span><div className="gallery-card-actions"><button disabled={index === 0} onClick={() => moveItem(setContent, "gallery", index, -1)} aria-label="Mover imagem para cima">↑</button><button disabled={index === items.length - 1} onClick={() => moveItem(setContent, "gallery", index, 1)} aria-label="Mover imagem para baixo">↓</button><button onClick={() => removeItem(setContent, "gallery", index)} aria-label="Eliminar imagem">×</button></div></div>
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
    {items.map((item, index) => <EditorCard key={item.id} index={index} title={item.title} onDelete={() => removeItem(setContent, "documents", index)} onMoveUp={index > 0 ? () => moveItem(setContent, "documents", index, -1) : undefined} onMoveDown={index < items.length - 1 ? () => moveItem(setContent, "documents", index, 1) : undefined}>
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
    {items.map((item, index) => <EditorCard key={item.id} index={index} title={item.title} onDelete={() => removeItem(setContent, "archive", index)} onMoveUp={index > 0 ? () => moveItem(setContent, "archive", index, -1) : undefined} onMoveDown={index < items.length - 1 ? () => moveItem(setContent, "archive", index, 1) : undefined}>
      <div className="field-row"><Field label="Ano" value={item.year} onChange={(value) => updateItem(setContent, "archive", index, "year", value)} /><Field label="Categoria" value={item.tag} onChange={(value) => updateItem(setContent, "archive", index, "tag", value)} /></div>
      <Field label="Título" value={item.title} onChange={(value) => updateItem(setContent, "archive", index, "title", value)} />
      <label className="toggle-field"><input type="checkbox" checked={Boolean(item.active)} onChange={(event) => updateItem(setContent, "archive", index, "active", event.target.checked)} /><span />Campanha em destaque</label>
    </EditorCard>)}
  </Collection>;
}

type MediaRecord = { filename: string; url: string; type: string; size: number; createdAt: string; source: "upload" | "website" | "brand"; deletable: boolean };

async function fetchMediaRecords() {
  const response = await fetch("/api/admin/media", { cache: "no-store" });
  const result = await response.json() as { media?: MediaRecord[]; error?: string };
  if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar os ficheiros.");
  return result.media ?? [];
}

function MediaLibrary({ role }: { role: UserRole }) {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Notice>(null);
  const load = useCallback(async () => {
    setMedia(await fetchMediaRecords());
  }, []);
  useEffect(() => {
    let active = true;
    void fetchMediaRecords()
      .then((items) => { if (active) setMedia(items); })
      .catch((error) => { if (active) setMessage({ type: "error", message: error instanceof Error ? error.message : "Não foi possível carregar os ficheiros." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function remove(item: MediaRecord) {
    if (!window.confirm("Eliminar este ficheiro permanentemente?")) return;
    const response = await fetch(`/api/admin/media/${encodeURIComponent(item.filename)}`, { method: "DELETE" });
    if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; setMessage({ type: "error", message: result.error ?? "Não foi possível eliminar o ficheiro." }); return; }
    setMessage({ type: "success", message: "Ficheiro eliminado." });
    await load();
  }
  return <div className="admin-collection media-library">
    <header><div><h2>Biblioteca de ficheiros</h2><p>Inclui as imagens, documentos e elementos institucionais que já fazem parte do website, além dos novos uploads.</p></div><strong>{media.length} ficheiros</strong></header>
    {message && <div className={`admin-notice ${message.type}`}>{message.message}</div>}
    {loading ? <div className="analytics-loading">A carregar ficheiros…</div> : <div className="media-grid">{media.map((item) => <article key={item.url}>
      <div className="media-preview">{item.type.startsWith("image/") ? <ManagedImage src={item.url} alt="" fill sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1180px) 40vw, 26vw" /> : item.type === "video/mp4" ? <video src={item.url} muted preload="metadata" /> : <span>PDF</span>}</div>
      <div className="media-card-info"><strong>{item.filename}</strong><small>{mediaSourceLabel(item.source)} · {mediaTypeLabel(item.type)} · {formatBytes(item.size)}</small><code>{item.url}</code></div>
      <footer className="media-actions"><a href={item.url} target="_blank" rel="noreferrer">Visualizar</a><button onClick={() => void navigator.clipboard.writeText(item.url)}>Copiar URL</button>{role === "admin" && item.deletable && <button className="danger" onClick={() => void remove(item)}>Eliminar</button>}</footer>
    </article>)}</div>}
  </div>;
}

type ContentVersion = {
  id: string;
  createdAt: string;
  author: string;
  changes: Array<{ area: string; count: number; details: string[] }>;
  totalChanges: number;
};

async function fetchContentVersions() {
  const response = await fetch("/api/admin/content/workflow", { cache: "no-store" });
  const result = await response.json() as { versions?: ContentVersion[]; error?: string };
  if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar o histórico.");
  return result.versions ?? [];
}

function HistoryEditor({ setContent, setNotice }: { setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>; setNotice: React.Dispatch<React.SetStateAction<Notice>> }) {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void fetchContentVersions()
      .then((items) => { if (active) setVersions(items); })
      .catch((error) => { if (active) setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível carregar o histórico." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [setNotice]);
  async function restore(version: ContentVersion) {
    if (!window.confirm("Recuperar esta versão como novo rascunho? O website publicado não será alterado até clicar em Publicar.")) return;
    const response = await fetch("/api/admin/content/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", versionId: version.id }) });
    const result = await response.json() as { content?: SiteContent; error?: string };
    if (!response.ok || !result.content) { setNotice({ type: "error", message: result.error ?? "Não foi possível recuperar a versão." }); return; }
    setContent(result.content);
    setNotice({ type: "success", message: "Versão recuperada como rascunho. Reveja e publique quando estiver pronta." });
  }
  async function importContent(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as SiteContent;
      setContent(parsed);
      setNotice({ type: "success", message: "Conteúdo importado para o editor. Guarde o rascunho para validar." });
    } catch {
      setNotice({ type: "error", message: "O ficheiro selecionado não contém JSON válido." });
    }
  }
  return <div className="admin-collection history-editor">
    <header><div><p className="admin-kicker">Controlo editorial</p><h2>Histórico e recuperação</h2><p>Compare cada versão com o website actual antes de a recuperar. A recuperação cria apenas um rascunho para revisão.</p></div><div className="history-actions"><a className="secondary" href="/api/admin/content/export">Exportar JSON</a><label>Importar JSON<input type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importContent(file); event.target.value = ""; }} /></label></div></header>
    {loading ? <div className="analytics-loading">A carregar histórico…</div> : versions.length ? <div className="history-list">{versions.map((version, index) => <article key={version.id}>
      <div className="history-version"><span>{String(index + 1).padStart(2, "0")}</span><div><small>Versão arquivada</small><strong>{new Date(version.createdAt).toLocaleString("pt-AO")}</strong><em>Publicação realizada por {version.author}</em></div></div>
      <div className="history-diff"><div><strong>Diferenças para o website actual</strong><span>{version.totalChanges ? `${version.totalChanges} ${version.totalChanges === 1 ? "alteração encontrada" : "alterações encontradas"}` : "Sem diferenças"}</span></div>{version.changes.length ? <ul>{version.changes.map((change) => <li key={change.area}><b>{change.area}</b><span>{change.details.join(" · ")}</span><i>{change.count}</i></li>)}</ul> : <p>Esta versão tem o mesmo conteúdo do website actualmente publicado.</p>}</div>
      <button className="history-restore-button" type="button" onClick={() => void restore(version)}><span aria-hidden="true">↶</span><strong>Recuperar versão</strong><small>Criar como rascunho</small></button>
    </article>)}</div> : <div className="admin-empty">O histórico será criado após a primeira nova publicação.</div>}
  </div>;
}

type AuditEntry = { timestamp?: string; action?: string; outcome?: string; username?: string | null; target?: string | null; source?: string };

function AuditViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/admin/audit", { cache: "no-store" }).then((response) => response.json()).then((result: { entries?: AuditEntry[] }) => setEntries(result.entries ?? [])).finally(() => setLoading(false)); }, []);
  return <div className="admin-collection audit-viewer">
    <header><div><h2>Auditoria administrativa</h2><p>Registo dos acessos, publicações, utilizadores e ficheiros.</p></div><a className="secondary" href="/api/admin/audit?download=1">Exportar registo</a></header>
    {loading ? <div className="analytics-loading">A carregar auditoria…</div> : <div className="audit-table"><div className="audit-head"><span>Data</span><span>Utilizador</span><span>Operação</span><span>Resultado</span></div>{entries.map((entry, index) => <article key={`${entry.timestamp}-${index}`}><time>{entry.timestamp ? new Date(entry.timestamp).toLocaleString("pt-AO") : "-"}</time><span>{entry.username || "Sistema"}</span><strong>{auditLabel(entry.action)}</strong><i className={entry.outcome === "success" ? "success" : "failure"}>{entry.outcome === "success" ? "Sucesso" : "Falha"}</i></article>)}</div>}
  </div>;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function mediaTypeLabel(type: string) {
  if (type === "application/pdf") return "Documento PDF";
  if (type === "video/mp4") return "Vídeo MP4";
  return "Imagem";
}

function mediaSourceLabel(source: MediaRecord["source"]) {
  if (source === "upload") return "Upload do backoffice";
  if (source === "brand") return "Marca institucional · protegido";
  return "Incluído no website · protegido";
}

function auditLabel(value?: string) {
  return ({ "auth.login": "Início de sessão", "auth.logout": "Fim de sessão", "auth.mfa": "Autenticação MFA", "content.draft_saved": "Rascunho guardado", "content.published": "Conteúdo publicado", "content.version_restored": "Versão recuperada", "media.uploaded": "Ficheiro carregado", "media.deleted": "Ficheiro eliminado", "user.created": "Utilizador criado", "user.updated": "Utilizador atualizado", "user.deleted": "Utilizador eliminado" } as Record<string, string>)[value ?? ""] ?? value ?? "Operação";
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
          {seo.ogImage && <ManagedImage className="seo-social-preview" src={seo.ogImage} alt="Pré-visualização da imagem de partilha" width={1200} height={630} sizes="(max-width: 760px) calc(100vw - 32px), 700px" />}
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
  const [createOpen, setCreateOpen] = useState(false);

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

  useEffect(() => {
    if (!createOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !creating) setCreateOpen(false); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [createOpen, creating]);

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
      setCreateOpen(false);
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

  async function resetPassword(user: PublicBackofficeUser) {
    const password = window.prompt(`Defina uma palavra-passe temporária para ${user.username}. Deve ter pelo menos 12 caracteres.`);
    if (!password) return;
    if (password.length < 12) { setMessage({ type: "error", message: "A palavra-passe temporária deve ter pelo menos 12 caracteres." }); return; }
    await changeUser(user.id, { password }, "Palavra-passe reposta. O utilizador terá de a alterar no próximo acesso.");
  }

  return <div className="users-admin">
    <header><div><p className="admin-kicker">Acessos e permissões</p><h2>Utilizadores e segurança</h2><p>Crie acessos, atribua perfis e controle a dupla autenticação.</p></div><div className="users-header-actions"><span className="security-badge">MFA obrigatório</span><button className="new-user-trigger" type="button" onClick={() => setCreateOpen(true)}><span aria-hidden="true">＋</span>Criar utilizador</button></div></header>
    {message && <div className={`admin-notice ${message.type}`}>{message.message}</div>}
    {createOpen && <div className="new-user-modal-backdrop" role="presentation" onClick={() => { if (!creating) setCreateOpen(false); }}><section className="new-user-modal" role="dialog" aria-modal="true" aria-labelledby="new-user-title" onClick={(event) => event.stopPropagation()}>
      <header><div><p className="admin-kicker">Novo acesso</p><h3 id="new-user-title">Criar utilizador</h3><p>Defina a identidade, o nível de acesso e uma palavra-passe temporária.</p></div><button type="button" onClick={() => setCreateOpen(false)} disabled={creating} aria-label="Fechar janela">×</button></header>
      <form className="new-user-form" onSubmit={create}>
        <label className="admin-field">Nome completo<input name="displayName" autoComplete="name" required placeholder="Ex.: Ana Manuel" /></label>
        <label className="admin-field">Nome de utilizador<input name="username" autoComplete="off" pattern="[A-Za-z0-9._-]+" required placeholder="Ex.: ana.manuel" /><small>Apenas letras, números, ponto, hífen e underscore.</small></label>
        <label className="admin-field">Email<input name="email" type="email" autoComplete="email" placeholder="nome@standardbank.co.ao" /></label>
        <label className="admin-field">Perfil de acesso<select name="role" defaultValue="editor"><option value="editor">Editor</option><option value="admin">Administrador</option></select><small>O administrador também gere utilizadores e segurança.</small></label>
        <label className="admin-field new-user-password">Palavra-passe temporária<input name="password" type="password" autoComplete="new-password" minLength={12} required placeholder="Mínimo de 12 caracteres" /><small>Será obrigatoriamente alterada no primeiro acesso, antes da configuração do Authenticator.</small></label>
        <footer><button className="new-user-cancel" type="button" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</button><button className="primary" disabled={creating}>{creating ? "A criar utilizador…" : "Criar utilizador"}</button></footer>
      </form>
    </section></div>}
    <div className="users-list">
      <div className="users-list-head"><span>Utilizador</span><span>Perfil</span><span>Segurança</span><span>Estado</span><span /></div>
      {loading ? <p className="users-loading">A carregar utilizadores…</p> : users.map((user) => <article key={user.id}>
        <div className="user-identity"><i>{user.displayName.slice(0, 1).toUpperCase()}</i><div><strong>{user.displayName}</strong><span>@{user.username}{user.username === currentUsername ? " · sessão actual" : ""}</span>{user.email && <small>{user.email}</small>}</div></div>
        <select value={user.role} disabled={user.username === currentUsername} onChange={(event) => void changeUser(user.id, { role: event.target.value }, "Perfil actualizado.")}><option value="editor">Editor</option><option value="admin">Administrador</option></select>
        <div className={`mfa-status ${user.mfaEnabled ? "enabled" : "pending"}`}><b>{user.mfaEnabled ? "Protegido" : "Pendente"}</b><span>{user.mfaEnabled ? "Authenticator activo" : "Configura no próximo login"}</span></div>
        <label className="user-active"><input type="checkbox" checked={user.active} disabled={user.username === currentUsername} onChange={(event) => void changeUser(user.id, { active: event.target.checked }, event.target.checked ? "Utilizador activado." : "Utilizador desactivado.")} /><span />{user.active ? "Activo" : "Inactivo"}</label>
        <div className="user-actions"><button onClick={() => void resetPassword(user)}>Repor palavra-passe</button><button onClick={() => void changeUser(user.id, { resetMfa: true }, "Dupla autenticação reposta. Será configurada no próximo login.")}>Repor MFA</button><button className="danger" disabled={user.username === currentUsername} onClick={() => void remove(user)}>Eliminar</button></div>
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

function EditorCard({ index, title, image, onDelete, onMoveUp, onMoveDown, children }: { index: number; title: string; image?: string; onDelete: () => void; onMoveUp?: () => void; onMoveDown?: () => void; children: React.ReactNode }) {
  return <article className="editor-card">{image && <ManagedImage className="editor-card-image" src={image} alt="" width={1600} height={900} sizes="(max-width: 760px) calc(100vw - 32px), 700px" />}<header><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><div className="editor-order-actions"><button disabled={!onMoveUp} onClick={onMoveUp} aria-label={`Mover ${title} para cima`}>↑</button><button disabled={!onMoveDown} onClick={onMoveDown} aria-label={`Mover ${title} para baixo`}>↓</button><button onClick={onDelete} aria-label={`Eliminar ${title}`}>Eliminar</button></div></header><div className="editor-card-fields">{children}</div></article>;
}

function Field({ label, value, multiline, onChange }: { label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  return <label className="admin-field">{label}{multiline ? <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function UploadField({ label, value, accept, busy, onChange, onUpload }: { label: string; value: string; accept: string; busy: boolean; onChange: (value: string) => void; onUpload: (file: File) => void }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const canPreview = Boolean(value) && ((value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) || value.startsWith("https://"));
  const inlinePreview = accept.includes("image/") || accept.includes("video/");
  return <>
    <div className="upload-field"><Field label={label} value={value} onChange={onChange} /><div className="upload-actions">
      {canPreview && (inlinePreview ? <button className="preview-button" type="button" onClick={() => setPreviewOpen(true)}>Visualizar</button> : <a className="preview-button" href={value} target="_blank" rel="noreferrer">Visualizar</a>)}
      <label className="upload-button">{busy ? "A carregar…" : "Carregar ficheiro"}<input type="file" accept={accept} disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ""; }} /></label>
    </div></div>
    {previewOpen && <div className="admin-media-modal" role="dialog" aria-modal="true" aria-label={`Pré-visualização: ${label}`} onClick={() => setPreviewOpen(false)}><div onClick={(event) => event.stopPropagation()}><button className="admin-media-modal-close" type="button" onClick={() => setPreviewOpen(false)} aria-label="Fechar pré-visualização">×</button>{accept.includes("video/") ? <video src={value} controls autoPlay playsInline /> : <ManagedImage src={value} alt={`Pré-visualização de ${label}`} width={2048} height={1434} sizes="94vw" />}<footer><code>{value}</code><a href={value} target="_blank" rel="noreferrer">Abrir em nova janela ↗</a></footer></div></div>}
  </>;
}

function ManagedImage({ src, alt, unoptimized, ...props }: ImageProps) {
  if (typeof src === "string" && !src.trim()) return null;
  const resolvedSrc = typeof src === "string" ? optimizedMediaUrl(src) : src;
  const bypassOptimizer = typeof resolvedSrc === "string" && (/^(?:https?:|data:|blob:)/i.test(resolvedSrc) || resolvedSrc.startsWith("/api/"));
  return <Image src={resolvedSrc} alt={alt} unoptimized={unoptimized ?? bypassOptimizer} {...props} />;
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

function moveItem<K extends ContentCollectionKey>(setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>, collection: K, index: number, direction: -1 | 1) {
  setContent((current) => {
    if (!current) return current;
    const destination = index + direction;
    if (destination < 0 || destination >= current[collection].length) return current;
    const items = [...current[collection]] as unknown[];
    [items[index], items[destination]] = [items[destination], items[index]];
    return { ...current, [collection]: items } as SiteContent;
  });
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}
