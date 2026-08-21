#!/usr/bin/env node
/**
 * Build GitHub-safe animated SVGs from character sources.
 *
 *   node ascii/generate.mjs
 *
 * SVGs use CSS only (no JavaScript) so they play inside README.md.
 * The homepage Cursor mark is the official 2.5D cube SVG, not generated here.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FONT =
  '"Courier New", Courier, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const COLORS = {
  lightFg: "#1f2328",
  lightMuted: "#656d76",
  darkFg: "#e6edf3",
  darkMuted: "#8b949e",
};

function visibleLen(line) {
  return Array.from(line).length;
}

function padEndVisible(line, width) {
  const extra = width - visibleLen(line);
  return extra > 0 ? line + " ".repeat(extra) : line;
}

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function themeCss() {
  return `:root { color-scheme: light dark; }
    .fg { fill: ${COLORS.lightFg}; }
    .muted { fill: ${COLORS.lightMuted}; }
    @media (prefers-color-scheme: dark) {
      .fg { fill: ${COLORS.darkFg}; }
      .muted { fill: ${COLORS.darkMuted}; }
    }
    text {
      font-family: ${FONT};
      font-kerning: none;
      font-variant-ligatures: none;
    }`;
}

function textEl({ cls, x, y, line, extra = "", style = "", textLength }) {
  const styleAttr = style ? ` style="${style}"` : "";
  const lengthAttr = textLength
    ? ` textLength="${textLength}" lengthAdjust="spacing"`
    : "";
  return `    <text class="${cls}" x="${x}" y="${y}" xml:space="preserve"${styleAttr}${lengthAttr}>${escapeXml(line)}${extra}</text>`;
}

function svgDoc({ title, width, height, fontSize, extraCss, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(title)}</title>
  <style>
    ${themeCss()}
    text { font-size: ${fontSize}px; }
    ${extraCss}
  </style>
  <rect width="100%" height="100%" fill="transparent"/>
${body}
</svg>
`;
}

function parseFrontMatter(source) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const meta = {};
  let i = 0;
  while (i < lines.length && lines[i].startsWith("# ")) {
    const body = lines[i].slice(2);
    const colon = body.indexOf(":");
    if (colon > 0) {
      meta[body.slice(0, colon).trim()] = body.slice(colon + 1).trim();
    }
    i += 1;
  }
  while (i < lines.length && lines[i].trim() === "") i += 1;
  return { meta, body: lines.slice(i).join("\n") };
}

function splitFrames(body) {
  return body
    .split(/\n# ---\n/)
    .map((frame) => frame.replace(/\n+$/, "").replace(/^\n+/, ""))
    .filter((frame) => frame.length > 0);
}

function buildTypewriterSvg(id, source) {
  const { meta, body } = parseFrontMatter(source);
  const phrases = splitFrames(body);
  const fontSize = Number(meta.fontSize || 16);
  const lineHeight = Number(meta.lineHeight || 28);
  const padX = 16;
  const padY = 10;
  const cols = Math.max(24, ...phrases.map(visibleLen));
  const charW = fontSize * 0.62;
  const width = Math.ceil(padX * 2 + (cols + 1) * charW);
  const height = padY * 2 + lineHeight;
  const period = Number(meta.period || 4);
  const total = phrases.length * period;
  const n = phrases.length;
  const textLength = ((cols + 1) * charW).toFixed(1);

  const nodes = phrases
    .map((phrase, i) => {
      const delay = (-((n - i) % n) * period).toFixed(2);
      return textEl({
        cls: "fg phrase",
        x: padX,
        y: padY + fontSize,
        line: padEndVisible(phrase, cols),
        extra: `<tspan class="blink">█</tspan>`,
        style: `animation-delay:${delay}s`,
        textLength,
      });
    })
    .join("\n");

  const hold = ((Math.max(0.2, period - 0.9) / total) * 100).toFixed(2);
  const hide = ((Math.max(0.1, period - 0.3) / total) * 100).toFixed(2);
  const slot = ((period / total) * 100).toFixed(2);

  return svgDoc({
    title: meta.title || id,
    width,
    height,
    fontSize,
    extraCss: `.phrase:nth-of-type(1) { opacity: 1; }
    .phrase { opacity: 0; }
    @media (prefers-reduced-motion: no-preference) {
      .phrase {
        opacity: 0;
        clip-path: inset(0 100% 0 0);
        animation: type ${total}s steps(${cols}, end) infinite;
      }
    }
    @keyframes type {
      0% { opacity: 0; clip-path: inset(0 100% 0 0); }
      1% { opacity: 1; clip-path: inset(0 100% 0 0); }
      ${hold}% { opacity: 1; clip-path: inset(0 0 0 0); }
      ${hide}% { opacity: 1; clip-path: inset(0 100% 0 0); }
      ${slot}%, 100% { opacity: 0; clip-path: inset(0 100% 0 0); }
    }
    .blink { animation: none; }
    @media (prefers-reduced-motion: no-preference) {
      .blink { animation: blink 1.05s step-end infinite; }
    }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .phrase { animation: none; }
      .phrase:nth-of-type(1) { opacity: 1; clip-path: none; }
    }`,
    body: nodes,
  });
}

function buildFramesSvg(id, source) {
  const { meta, body } = parseFrontMatter(source);
  const frames = splitFrames(body);
  const fontSize = Number(meta.fontSize || 13);
  const lineHeight = Number(meta.lineHeight || 15);
  const fps = Number(meta.fps || 8);
  const padX = 20;
  const padY = 16;
  const frameLines = frames.map((frame) => frame.split("\n"));
  const rows = Math.max(...frameLines.map((lines) => lines.length));
  const cols = Math.max(
    1,
    ...frameLines.flatMap((lines) => lines.map(visibleLen)),
  );
  const charW = fontSize * 0.62;
  const width = Math.ceil(padX * 2 + cols * charW);
  const height = Math.ceil(padY * 2 + rows * lineHeight);
  const dur = frames.length / fps;
  const slice = (100 / frames.length).toFixed(3);
  const textLength = (cols * charW).toFixed(1);

  const nodes = frameLines
    .map((lines, fi) => {
      const delay = (fi / fps - dur).toFixed(3);
      const texts = lines
        .map((line, li) => {
          const y = padY + fontSize + li * lineHeight;
          return textEl({
            cls: "fg",
            x: padX,
            y,
            line: padEndVisible(line, cols),
            textLength,
          }).replace(/^    /, "      ");
        })
        .join("\n");
      return `    <g class="frame" style="animation-delay:${delay}s">\n${texts}\n    </g>`;
    })
    .join("\n");

  return svgDoc({
    title: meta.title || id,
    width,
    height,
    fontSize,
    extraCss: `.frame:nth-of-type(1) { opacity: 1; }
    .frame { opacity: 0; }
    @media (prefers-reduced-motion: no-preference) {
      .frame {
        opacity: 0;
        animation: cycle ${dur.toFixed(2)}s steps(1, end) infinite;
      }
    }
    @keyframes cycle {
      0% { opacity: 1; }
      ${slice}% { opacity: 0; }
      100% { opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .frame { animation: none; opacity: 0; }
      .frame:nth-of-type(1) { opacity: 1; }
    }`,
    body: nodes,
  });
}

function writeFile(rel, contents) {
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, contents);
  return dest;
}

function buildFromSource(id, source) {
  const { meta } = parseFrontMatter(source);
  if (meta.kind === "typewriter") return buildTypewriterSvg(id, source);
  if (meta.kind === "frames") return buildFramesSvg(id, source);
  throw new Error(`unknown kind "${meta.kind || ""}" in ${id}`);
}

function main() {
  const items = [];
  const srcDir = path.join(ROOT, "src");
  const sources = fs
    .readdirSync(srcDir)
    .filter((name) => name.endsWith(".txt"))
    .sort();

  for (const name of sources) {
    const id = name.slice(0, -".txt".length);
    const source = fs.readFileSync(path.join(srcDir, name), "utf8");
    const { meta } = parseFrontMatter(source);
    writeFile(`${id}.svg`, buildFromSource(id, source));
    items.push({
      id,
      title: meta.title || id,
      svg: `${id}.svg`,
      source: `src/${name}`,
    });
  }

  writeFile(
    "manifest.json",
    JSON.stringify({ generatedBy: "ascii/generate.mjs", items }, null, 2) + "\n",
  );
  console.log("Wrote character animations:");
  for (const item of items) console.log(" -", item.svg);
}

main();
