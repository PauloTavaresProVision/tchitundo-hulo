"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AgendaItem, CampaignArchiveItem, DocumentItem, GalleryItem, SiteContent } from "@/content/site-content";

type Tab = "overview" | "agenda" | "gallery" | "documents" | "archive";
type Notice = { type: "success" | "error"; message: string } | null;

const tabs: Array<{ id: Tab; label: string; symbol: string }> = [
  { id: "overview", label: "Visão geral", symbol: "◫" },
  { id: "agenda", label: "Agenda cultural", symbol: "◇" },
  { id: "gallery", label: "Galeria", symbol: "▦" },
  { id: "documents", label: "Documentos", symbol: "▤" },
  { id: "archive", label: "Campanhas", symbol: "◎" },
];

export default function AdminPage() {
  const [booting, setBooting] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

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
      const state = await response.json() as { authenticated: boolean; configured: boolean; username?: string };
      setConfigured(state.configured);
      setAuthenticated(state.authenticated);
      setUsername(state.username ?? "");
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
    const result = await response.json() as { error?: string; username?: string };
    if (!response.ok) {
      setNotice({ type: "error", message: result.error ?? "Não foi possível iniciar sessão." });
      return;
    }
    setAuthenticated(true);
    setUsername(result.username ?? String(form.get("username") ?? ""));
    await loadContent();
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setContent(null);
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
  if (!authenticated) return <AdminLogin configured={configured} notice={notice} onSubmit={login} />;
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
          <div><strong>{username}</strong><small>Administrador</small></div>
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
            <button className="primary" onClick={save} disabled={saving}>{saving ? "A guardar…" : "Guardar alterações"}</button>
          </div>
        </header>

        {notice && <div className={`admin-notice ${notice.type}`} role="status">{notice.message}</div>}

        <section className="admin-workspace">
          {activeTab === "overview" && <Overview content={content} onNavigate={setActiveTab} />}
          {activeTab === "agenda" && <AgendaEditor items={content.agenda} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "gallery" && <GalleryEditor items={content.gallery} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "documents" && <DocumentsEditor items={content.documents} setContent={setContent} upload={upload} uploading={uploading} />}
          {activeTab === "archive" && <ArchiveEditor items={content.archive} setContent={setContent} />}
        </section>
      </main>
    </div>
  );
}

function AdminLogin({ configured, notice, onSubmit }: { configured: boolean; notice: Notice; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <main className="admin-login-page">
      <section className="admin-login-art">
        <img src="/brand/standard-bank-logo-white-official.png" alt="Standard Bank" />
        <div><p>Plataforma editorial</p><h1>Tchitundo-Hulo</h1><span>Património · Identidade · Futuro</span></div>
      </section>
      <section className="admin-login-panel">
        <form onSubmit={onSubmit}>
          <p className="admin-kicker">Área reservada</p>
          <h2>Bem-vindo ao backoffice</h2>
          <p>Gira conteúdos, imagens, documentos e a agenda cultural da plataforma.</p>
          {!configured && <div className="admin-notice error">Configure BACKOFFICE_USERNAME, BACKOFFICE_PASSWORD e BACKOFFICE_SESSION_SECRET no servidor.</div>}
          {notice && <div className={`admin-notice ${notice.type}`}>{notice.message}</div>}
          <label>Utilizador<input name="username" autoComplete="username" required /></label>
          <label>Palavra-passe<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="primary" type="submit" disabled={!configured}>Entrar</button>
          <small>A sessão expira automaticamente após 8 horas.</small>
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

function updateItem<K extends keyof SiteContent>(setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>, collection: K, index: number, field: string, value: unknown) {
  setContent((current) => {
    if (!current) return current;
    const list = [...current[collection]] as Array<Record<string, unknown>>;
    list[index] = { ...list[index], [field]: value };
    return { ...current, [collection]: list } as SiteContent;
  });
}

function removeItem<K extends keyof SiteContent>(setContent: React.Dispatch<React.SetStateAction<SiteContent | null>>, collection: K, index: number) {
  setContent((current) => current ? ({ ...current, [collection]: current[collection].filter((_, itemIndex) => itemIndex !== index) } as SiteContent) : current);
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}
