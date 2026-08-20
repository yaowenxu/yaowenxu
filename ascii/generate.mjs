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

/** Canonical Cursor mark from the simple-icons path (viewBox 0 0 24 24). */
const CURSOR_FACES = [
  {
    ch: "░",
    pts: [
      [11.925, 24],
      [22.35, 17.988],
      [11.925, 11.976],
      [1.5, 17.988],
    ],
  },
  {
    ch: "▒",
    pts: [
      [23.85, 17.988],
      [23.85, 6.012],
      [13.5, 0],
      [13.5, 11.976],
    ],
  },
  {
    ch: "█",
    pts: [
      [0, 6.012],
      [0, 17.988],
      [10.425, 11.976],
      [10.425, 0],
    ],
  },
];

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

function rasterizeCursorLogo(cols = 36, rows = 16) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(" "));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * 24;
      const y = ((r + 0.5) / rows) * 24;
      for (const face of CURSOR_FACES) {
        if (pointInPolygon(x, y, face.pts)) grid[r][c] = face.ch;
      }
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
${body}
</svg>
`;
}

function buildCursorLogoSvg() {
  const logo = rasterizeCursorLogo(36, 16);
  const right = CURSOR_WORDMARK;
  const lines = joinHorizontal(logo, right, 5);
  const cols = Math.max(...lines.map(visibleLen));
  const padded = lines.map((line) => padEndVisible(line, cols));
  const fontSize = 13;
  const lineHeight = 14;
  const padX = 24;
  const padY = 18;
  const charW = fontSize * 0.62;
  const width = Math.ceil(padX * 2 + (cols + 1) * charW + 12);
  const height = Math.ceil(padY * 2 + padded.length * lineHeight);
  const lastMark = CURSOR_WORDMARK.length - 1;
  const rightTop = Math.floor((padded.length - right.length) / 2);
  const blinkRow = rightTop + lastMark;
  const textLength = ((cols + 1) * charW).toFixed(1);

  const body = padded
    .map((line, i) => {
      const y = padY + fontSize + i * lineHeight;
      const delay = (0.05 + i * 0.08).toFixed(2);
      const cls = "fg line";
      const extra =
        i === blinkRow ? `<tspan class="blink">█</tspan>` : "";
      return textEl({
        cls,
        x: padX,
        y,
        line,
        extra,
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
    extraCss: `.line {
      clip-path: inset(0 100% 0 0);
      animation: reveal 0.65s steps(${cols}, end) forwards;
    }
    @keyframes reveal { to { clip-path: inset(0 0 0 0); } }
    .blink {
      animation: blink 1.05s step-end infinite;
      animation-delay: 1.8s;
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
    extraCss: `.phrase {
      opacity: 0;
      clip-path: inset(0 100% 0 0);
      animation: type ${total}s steps(${cols}, end) infinite;
    }
    @keyframes type {
      0% { opacity: 0; clip-path: inset(0 100% 0 0); }
      1% { opacity: 1; clip-path: inset(0 100% 0 0); }
      ${hold}% { opacity: 1; clip-path: inset(0 0 0 0); }
      ${hide}% { opacity: 1; clip-path: inset(0 100% 0 0); }
      ${slot}%, 100% { opacity: 0; clip-path: inset(0 100% 0 0); }
    }
    .blink { animation: blink 1.05s step-end infinite; }
    @keyframes blink { 50% { opacity: 0; } }`,
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
    extraCss: `.frame {
      opacity: 0;
      animation: cycle ${dur.toFixed(2)}s steps(1, end) infinite;
    }
    @keyframes cycle {
      0% { opacity: 1; }
      ${slice}% { opacity: 0; }
      100% { opacity: 0; }
    }`,
    body: nodes,
  });
}

function makeWaveSource() {
  const width = 52;
  const height = 9;
  const frames = 16;
  const amp = (height - 1) / 2.35;
  const mid = (height - 1) / 2;
  const out = [];
  for (let t = 0; t < frames; t++) {
    const grid = Array.from({ length: height }, () => Array(width).fill(" "));
    for (let x = 0; x < width; x++) {
      const phase = (x / width) * Math.PI * 2 + (t / frames) * Math.PI * 2;
      const y = Math.round(mid + Math.sin(phase) * amp);
      grid[y][x] = "█";
      const y2 = Math.round(mid + Math.sin(phase) * amp * 0.55);
      if (grid[y2][x] === " ") grid[y2][x] = "*";
    }
    out.push(grid.map((row) => row.join("").replace(/\s+$/, "")).join("\n"));
  }
  return [
    "# title: Character wave",
    "# kind: frames",
    "# fps: 10",
    "# fontSize: 13",
    "# lineHeight: 14",
    "",
    out.join("\n# ---\n"),
    "",
  ].join("\n");
}

function writeFile(rel, contents) {
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, contents);
  return dest;
}

function main() {
  const logo = rasterizeCursorLogo(36, 16);
  const lockup = joinHorizontal(logo, CURSOR_WORDMARK, 5);
  writeFile(
    "src/cursor-logo.txt",
    [
      "# title: Cursor character logo",
      "# kind: cursor-logo",
      "# Generated from the canonical Cursor mark (simple-icons path).",
      "# Re-run node ascii/generate.mjs after editing generate.mjs.",
      "",
      ...lockup,
      "",
    ].join("\n"),
  );

  const typingPath = path.join(ROOT, "src/typing-line.txt");
  if (!fs.existsSync(typingPath)) {
    throw new Error("missing ascii/src/typing-line.txt");
  }
  const typingSource = fs.readFileSync(typingPath, "utf8");
  const waveSource = makeWaveSource();
  writeFile("src/signal.txt", waveSource);

  writeFile("cursor-logo.svg", buildCursorLogoSvg());
  writeFile("typing-line.svg", buildTypewriterSvg("typing-line", typingSource));
  writeFile("signal.svg", buildFramesSvg("signal", waveSource));

  const manifest = {
    generatedBy: "ascii/generate.mjs",
    items: [
      {
        id: "cursor-logo",
        title: "Cursor character logo",
        svg: "cursor-logo.svg",
        source: "src/cursor-logo.txt",
      },
      {
        id: "typing-line",
        title: "Typing line",
        svg: "typing-line.svg",
        source: "src/typing-line.txt",
      },
      {
        id: "signal",
        title: "Character wave",
        svg: "signal.svg",
        source: "src/signal.txt",
      },
    ],
  };
  writeFile("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  console.log("Wrote character animations:");
  for (const item of manifest.items) console.log(" -", item.svg);
}

main();
