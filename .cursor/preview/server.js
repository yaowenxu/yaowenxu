"use strict";

// Minimal, self-contained preview server for the GitHub profile README.
// Renders ../../README.md with GitHub-like styling on every request so that
// edits are reflected on refresh. No external network calls are made.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const MarkdownIt = require("markdown-it");

const HOST = process.env.PREVIEW_HOST || "0.0.0.0";
const PORT = Number(process.env.PREVIEW_PORT || 6419);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const README_PATH = path.join(REPO_ROOT, "README.md");
const CSS_PATH = require.resolve("github-markdown-css/github-markdown.css");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const MIME = {
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function isInsideRepo(filePath) {
  const rel = path.relative(REPO_ROOT, filePath);
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

function serveStatic(req, res, pathname) {
  const relative = pathname.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(REPO_ROOT, relative));
  if (!isInsideRepo(filePath)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return true;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext];
  if (!mime || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function renderPage() {
  const source = fs.readFileSync(README_PATH, "utf8");
  const body = md.render(source);
  const css = fs.readFileSync(CSS_PATH, "utf8");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile README preview</title>
<style>${css}</style>
<style>
  body { margin: 0; background: #ffffff; }
  .markdown-body { box-sizing: border-box; max-width: 980px; margin: 0 auto; padding: 45px; }
  @media (max-width: 767px) { .markdown-body { padding: 15px; } }
</style>
</head>
<body>
<article class="markdown-body">
${body}
</article>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${HOST}:${PORT}`).pathname;
  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  if (pathname !== "/" && serveStatic(req, res, pathname)) {
    return;
  }
  try {
    const html = renderPage();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`Failed to render README: ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Profile README preview running at http://${HOST}:${PORT}`);
  console.log(`Rendering ${README_PATH}`);
});
