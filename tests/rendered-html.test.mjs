import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const runtimeEnv = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const runtimeContext = {
  waitUntil() {},
  passThroughOnException() {},
};

async function getWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

async function render() {
  const worker = await getWorker();
  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    runtimeEnv,
    runtimeContext,
  );
}

test("server-renders the Tchitundo-Hulo campaign", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Tchitundo-Hulo \| Standard Bank Angola<\/title>/i);
  assert.match(html, /Tchitundo-/i);
  assert.match(html, /Marcas na pedra\. Memória viva\./i);
  assert.match(html, /standard-bank-logo-white-official\.png/i);
  assert.match(html, /favicon-32x32\.png/i);
  assert.match(html, /apple-touch-icon\.png/i);
  assert.match(html, /Agenda cultural/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps the campaign CMS-ready and Docker-ready on port 7788", async () => {
  const [page, css, content, dockerfile, compose] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../content/site-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
    readFile(new URL("../compose.yaml", import.meta.url), "utf8"),
  ]);

  assert.match(page, /from "@\/content\/site-content"/);
  assert.match(page, /gallery\.map/);
  assert.match(page, /agenda\.map/);
  assert.match(page, /ArrowLeft/);
  assert.match(page, /ArrowRight/);
  assert.match(content, /export const siteContent/);
  assert.match(css, /\.brand \{ width: 240px;/);
  assert.match(dockerfile, /EXPOSE 7788/);
  assert.match(dockerfile, /--port", "7788"/);
  assert.match(compose, /"7788:7788"/);
  assert.match(compose, /tchitundo_content:\/app\/data/);
  assert.match(page, /fetch\("\/api\/content"/);
});

test("protects the backoffice and persists managed content and uploads", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "tchitundo-backoffice-"));
  process.env.CONTENT_DATA_PATH = path.join(directory, "content.json");
  process.env.CONTENT_UPLOADS_DIR = path.join(directory, "uploads");
  process.env.BACKOFFICE_USERNAME = "editor";
  process.env.BACKOFFICE_PASSWORD = "test-password";
  process.env.BACKOFFICE_SESSION_SECRET = "test-session-secret-with-sufficient-length";

  try {
    const worker = await getWorker();
    const unauthorized = await worker.fetch(new Request("http://localhost/api/admin/content"), runtimeEnv, runtimeContext);
    assert.equal(unauthorized.status, 401);

    const login = await worker.fetch(new Request("http://container:7788/api/admin/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: "container:7788",
        Origin: "https://patrimonio.example.com",
        "X-Forwarded-Host": "patrimonio.example.com",
        "X-Forwarded-Proto": "https",
      },
      body: JSON.stringify({ username: "editor", password: "test-password" }),
    }), runtimeEnv, runtimeContext);
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);

    const initial = await worker.fetch(new Request("http://localhost/api/admin/content", { headers: { Cookie: cookie } }), runtimeEnv, runtimeContext);
    assert.equal(initial.status, 200);
    const content = await initial.json();
    content.agenda[0].title = "Agenda actualizada no backoffice";

    const saved = await worker.fetch(new Request("http://localhost/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: "http://localhost" },
      body: JSON.stringify(content),
    }), runtimeEnv, runtimeContext);
    assert.equal(saved.status, 200);

    const form = new FormData();
    form.set("file", new File([new Uint8Array([137, 80, 78, 71])], "teste.png", { type: "image/png" }));
    const uploaded = await worker.fetch(new Request("http://localhost/api/admin/uploads", {
      method: "POST",
      headers: { Cookie: cookie, Origin: "http://localhost" },
      body: form,
    }), runtimeEnv, runtimeContext);
    assert.equal(uploaded.status, 200);
    const media = await uploaded.json();
    assert.match(media.url, /^\/api\/media\//);

    const publicContent = await worker.fetch(new Request("http://localhost/api/content"), runtimeEnv, runtimeContext);
    assert.equal(publicContent.status, 200);
    assert.equal((await publicContent.json()).agenda[0].title, "Agenda actualizada no backoffice");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
