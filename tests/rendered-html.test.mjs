import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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

function totpCode(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  const output = [];
  for (const character of secret) {
    buffer = (buffer << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", Buffer.from(output)).update(counterBytes).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(value % 1_000_000).padStart(6, "0");
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

test("protects the backoffice with MFA, users, managed content and uploads", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "tchitundo-backoffice-"));
  process.env.CONTENT_DATA_PATH = path.join(directory, "content.json");
  process.env.CONTENT_UPLOADS_DIR = path.join(directory, "uploads");
  process.env.BACKOFFICE_USERS_PATH = path.join(directory, "users.json");
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
    const loginState = await login.json();
    assert.equal(loginState.stage, "setup");
    assert.match(loginState.setup.qrCode, /^data:image\/png;base64,/);
    const challengeCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(challengeCookie);

    const mfa = await worker.fetch(new Request("http://container:7788/api/admin/mfa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: challengeCookie,
        Host: "container:7788",
        Origin: "https://patrimonio.example.com",
        "X-Forwarded-Host": "patrimonio.example.com",
        "X-Forwarded-Proto": "https",
      },
      body: JSON.stringify({ code: totpCode(loginState.setup.secret) }),
    }), runtimeEnv, runtimeContext);
    assert.equal(mfa.status, 200);
    const sessionHeader = mfa.headers.get("set-cookie") ?? "";
    const sessionMatch = sessionHeader.match(/sb_backoffice_session=([^;,\s]+)/);
    assert.ok(sessionMatch);
    const cookie = `sb_backoffice_session=${sessionMatch[1]}`;

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

    const createdUser = await worker.fetch(new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: "http://localhost" },
      body: JSON.stringify({ username: "marketing", displayName: "Equipa de Marketing", email: "marketing@example.com", role: "editor", password: "temporary-password-2026" }),
    }), runtimeEnv, runtimeContext);
    assert.equal(createdUser.status, 201);
    assert.equal((await createdUser.json()).user.mfaEnabled, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
