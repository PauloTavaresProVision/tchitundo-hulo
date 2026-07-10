import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
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
});
