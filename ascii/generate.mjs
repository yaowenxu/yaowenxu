#!/usr/bin/env node
/**
 * Build GitHub-safe animated SVGs from character sources.
 *
 *   node ascii/generate.mjs
 *
 * SVGs use CSS only (no JavaScript) so they play inside README.md.
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

/**
 * Canonical Cursor cube from the official brand kit (CUBE_2D_LIGHT.svg /
 * CUBE_25D.svg). The mark is an isometric hexagon with a cursor-arrow
 * cutout — the three cube faces without that arrow are not the logo.
 *
 * viewBox 0 0 466.73 532.09. Tiny corner radii are collapsed to vertices.
 */
const CURSOR_VIEW = { w: 466.73, h: 532.09 };
const CURSOR_CENTER = [233.365, 266.045];

const CURSOR_OUTER = [
  [233.37, 2.96],
  [9.3, 125.94],
  [9.3, 406.15],
  [233.37, 529.13],
  [457.43, 406.15],
  [457.43, 125.94],
];

const CURSOR_ARROW = [
  [26.23, 140.61],
  [437.49, 140.61],
  [444.05, 151.99],
  [238.42, 508.15],
  [238.42, 272.22],
  [231.89, 260.91],
  [24.87, 145.67],
];

const CURSOR_FACES = [
  {
    ch: "░",
    pts: [
      CURSOR_CENTER,
      [457.43, 406.15],
      [233.37, 529.13],
      [9.3, 406.15],
    ],
  },
  {
    ch: "█",
    pts: [
      [233.37, 2.96],
      [457.43, 125.94],
      [457.43, 406.15],
      CURSOR_CENTER,
    ],
  },
  {
    ch: "▒",
    pts: [
      [233.37, 2.96],
      CURSOR_CENTER,
      [9.3, 406.15],
      [9.3, 125.94],
    ],
  },
];

const LOGO_FONT_SIZE = 13;
const LOGO_LINE_HEIGHT = 14;
const LOGO_CHAR_ASPECT = 0.62;
const LOGO_ROWS = 20;

const CURSOR_WORDMARK = [
  "  ____ _   _ ____  ____   ___  ____",
  " / ___| | | |  _ \\/ ___| / _ \\|  _ \\",
  "| |   | | | | |_) \\___ \\| | | | |_) |",
  "| |___| |_| |  _ < ___) | |_| |  _ <",
  " \\____|\\___/|_| \\_\\____/ \\___/|_| \\_\\",
];

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function logoCols(rows = LOGO_ROWS) {
  return Math.round(
    rows *
      (CURSOR_VIEW.w / CURSOR_VIEW.h) *
      (LOGO_LINE_HEIGHT / (LOGO_FONT_SIZE * LOGO_CHAR_ASPECT)),
  );
}

function sampleCursorGlyph(x, y) {
  if (!pointInPolygon(x, y, CURSOR_OUTER) || pointInPolygon(x, y, CURSOR_ARROW)) {
    return " ";
  }
  for (const face of CURSOR_FACES) {
    if (pointInPolygon(x, y, face.pts)) return face.ch;
  }
  return "▒";
}

function rasterizeCursorLogo(cols = logoCols(), rows = LOGO_ROWS, sub = 3) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(" "));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const counts = new Map();
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const x = ((c + (sx + 0.5) / sub) / cols) * CURSOR_VIEW.w;
          const y = ((r + (sy + 0.5) / sub) / rows) * CURSOR_VIEW.h;
          const ch = sampleCursorGlyph(x, y);
          counts.set(ch, (counts.get(ch) || 0) + 1);
        }
      }
      let best = " ";
      let n = -1;
      for (const [ch, k] of counts) {
        if (k > n || (k === n && ch !== " ")) {
          best = ch;
          n = k;
        }
      }
      grid[r][c] = best;
    }
  }
  const lines = grid.map((row) => row.join("").replace(/\s+$/, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines;
}

function visibleLen(line) {
  return Array.from(line).length;
}

function padEndVisible(line, width) {
  const extra = width - visibleLen(line);
  return extra > 0 ? line + " ".repeat(extra) : line;
}

function joinHorizontal(left, right, gap = 4) {
  const height = Math.max(left.length, right.length);
  const leftW = Math.max(0, ...left.map(visibleLen));
  const topLeft = Math.floor((height - left.length) / 2);
  const topRight = Math.floor((height - right.length) / 2);
  const spacer = " ".repeat(gap);
  const lines = [];
  for (let i = 0; i < height; i++) {
    const l = i >= topLeft && i - topLeft < left.length ? left[i - topLeft] : "";
    const r =
      i >= topRight && i - topRight < right.length ? right[i - topRight] : "";
    lines.push(padEndVisible(l, leftW) + spacer + r);
  }
  return lines;
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

function buildCursorLogoSvg() {
  const logo = rasterizeCursorLogo();
  const right = CURSOR_WORDMARK;
  const lines = joinHorizontal(logo, right, 5);
  const cols = Math.max(...lines.map(visibleLen));
  // Pad every row to cols+1 so the blink glyph can replace the last cell
  // without changing textLength / column spacing on the other rows.
  const padded = lines.map((line) => padEndVisible(line, cols + 1));
  const fontSize = LOGO_FONT_SIZE;
  const lineHeight = LOGO_LINE_HEIGHT;
  const padX = 24;
  const padY = 18;
  const charW = fontSize * LOGO_CHAR_ASPECT;
  const width = Math.ceil(padX * 2 + (cols + 1) * charW + 12);
  const height = Math.ceil(padY * 2 + padded.length * lineHeight);
  const lastMark = CURSOR_WORDMARK.length - 1;
  const rightTop = Math.floor((padded.length - right.length) / 2);
  const blinkRow = rightTop + lastMark;
  const textLength = ((cols + 1) * charW).toFixed(1);

  const body = padded
    .map((line, i) => {
      const y = padY + fontSize + i * lineHeight;
      const delay = (i * 0.05).toFixed(2);
      const blinking = i === blinkRow;
      return textEl({
        cls: "fg line",
        x: padX,
        y,
        line: blinking ? line.slice(0, -1) : line,
        extra: blinking ? `<tspan class="blink">█</tspan>` : "",
        style: `animation-delay:${delay}s`,
        textLength,
      });
    })
    .join("\n");

  return svgDoc({
    title: "Cursor character logo",
    width,
    height,
    fontSize,
    extraCss: `.line { animation: none; }
    @media (prefers-reduced-motion: no-preference) {
      .line {
        animation: reveal 0.9s steps(${cols}, end) both;
      }
    }
    @keyframes reveal {
      from { clip-path: inset(0 100% 0 0); }
      to { clip-path: inset(0 0 0 0); }
    }
    .blink { animation: none; }
    @media (prefers-reduced-motion: no-preference) {
      .blink { animation: blink 1.05s step-end infinite; }
    }
    @keyframes blink { 50% { opacity: 0; } }`,
    body,
  });
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

function decodeXml(text) {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function logoLineGlyphCounts(svg) {
  return [...svg.matchAll(/<text class="fg line"[^>]*>([\s\S]*?)<\/text>/g)].map(
    ([, inner]) => visibleLen(decodeXml(inner.replace(/<[^>]+>/g, ""))),
  );
}

function assertCursorCutout(lines) {
  const holeRows = lines.filter((line) => /[█▒░]\s{4,}[█▒░]/.test(line)).length;
  if (holeRows < 4) {
    throw new Error(
      `logo is missing the cursor-arrow cutout (hole rows: ${holeRows})`,
    );
  }
  const glyphs = new Set(lines.join(""));
  for (const ch of ["█", "▒", "░"]) {
    if (!glyphs.has(ch)) throw new Error(`logo is missing face glyph ${ch}`);
  }
}

function assertAlignedLogoLines(svg) {
  const counts = logoLineGlyphCounts(svg);
  if (!counts.length) throw new Error("logo SVG has no text lines");
  if (counts.some((n) => n !== counts[0])) {
    throw new Error(`logo glyph counts diverge: ${counts.join(",")}`);
  }
}

function buildFromSource(id, source) {
  const { meta } = parseFrontMatter(source);
  if (meta.kind === "typewriter") return buildTypewriterSvg(id, source);
  if (meta.kind === "frames") return buildFramesSvg(id, source);
  throw new Error(`unknown kind "${meta.kind || ""}" in ${id}`);
}

function main() {
  const logo = rasterizeCursorLogo();
  assertCursorCutout(logo);
  const lockup = joinHorizontal(logo, CURSOR_WORDMARK, 5);
  writeFile(
    "src/cursor-logo.txt",
    [
      "# title: Cursor character logo",
      "# kind: cursor-logo",
      "# Generated from the official Cursor cube (brand kit CUBE_2D / CUBE_25D).",
      "# The mark is the isometric cube with a cursor-arrow cutout.",
      "# Re-run node ascii/generate.mjs after editing generate.mjs.",
      "",
      ...lockup,
      "",
    ].join("\n"),
  );

  const items = [
    {
      id: "cursor-logo",
      title: "Cursor character logo",
      svg: "cursor-logo.svg",
      source: "src/cursor-logo.txt",
    },
  ];
  const logoSvg = buildCursorLogoSvg();
  writeFile("cursor-logo.svg", logoSvg);
  assertAlignedLogoLines(logoSvg);

  const srcDir = path.join(ROOT, "src");
  const sources = fs
    .readdirSync(srcDir)
    .filter((name) => name.endsWith(".txt") && name !== "cursor-logo.txt")
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

  writeFile("manifest.json", JSON.stringify({ generatedBy: "ascii/generate.mjs", items }, null, 2) + "\n");
  console.log("Wrote character animations:");
  for (const item of items) console.log(" -", item.svg);
}

main();
