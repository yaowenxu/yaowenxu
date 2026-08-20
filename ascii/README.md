# Character animations

GitHub profile homepage animations made of characters. Each item is an SVG
with CSS motion (no JavaScript), so it plays inside `README.md`.

## Show on the homepage

`README.md` embeds the generated SVGs. Keep the image paths rooted at this
folder:

```html
<img src="ascii/cursor-logo.svg" alt="Cursor character logo" />
```

## Add or edit an animation

1. Put character frames in `src/`.
2. Run `node ascii/generate.mjs`.
3. Commit both the source and the generated `.svg`.

Source notes:

- `src/cursor-logo.txt` is generated from the canonical Cursor mark inside
  `generate.mjs`. Edit the rasterizer or wordmark there, then regenerate.
- `src/typing-line.txt` is a looping typewriter. Split phrases with `# ---`.
- `src/signal.txt` is rebuilt as a traveling character wave each generate.

Front matter (lines starting with `# key: value`) sets title, font size, and
timing. Frame animations use `# fps:` and separate frames with `# ---`.
