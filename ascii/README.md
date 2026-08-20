# Character animations

GitHub profile homepage animations made of characters. Each item is an SVG
with CSS motion (no JavaScript), so it plays inside `README.md`.

The homepage keeps two pieces:

- Cursor character logo (canonical mark, typed in once with a blinking cursor)
- a one-line status that says the page is currently building with Cursor

## Show on the homepage

`README.md` embeds the generated SVGs. Keep the image paths rooted at this
folder:

```html
<img src="ascii/cursor-logo.svg" alt="Cursor character logo" />
<img src="ascii/typing-line.svg" alt="building with Cursor" />
```

## Add or edit an animation

1. Put character frames in `src/`.
2. Run `node ascii/generate.mjs`.
3. Commit both the source and the generated `.svg`.

Source notes:

- `src/cursor-logo.txt` is generated from the canonical Cursor mark inside
  `generate.mjs`. Edit the rasterizer or wordmark there, then regenerate.
- `src/typing-line.txt` is a looping typewriter. Split phrases with `# ---`.

Front matter (lines starting with `# key: value`) sets title, font size, and
timing. Frame animations use `# kind: frames`, `# fps:`, and separate frames
with `# ---`.
