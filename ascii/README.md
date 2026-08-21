# Homepage assets

The profile README shows:

- the official Cursor 2.5D cube (`cursor-cube-25d.svg`) and the outlined
  `CURSOR` wordmark (`cursor-wordmark.svg`) on one row
- a one-line status that says the page is currently building with Cursor

## Show on the homepage

`README.md` embeds these files. Keep the image paths rooted at this
folder, and keep the cube and wordmark in the same paragraph so they
stay on one line:

```html
<img src="ascii/cursor-cube-25d.svg" alt="Cursor" />
<img src="ascii/cursor-wordmark.svg" alt="CURSOR" />
<img src="ascii/typing-line.svg" alt="building with Cursor" />
```

The cube uses inline `fill` colors (not a `<style>` block) so GitHub
does not strip the 2.5D shading.

## Add or edit an animation

1. Put character frames in `src/`.
2. Run `node ascii/generate.mjs`.
3. Commit both the source and the generated `.svg`.

Source notes:

- `src/cursor-wordmark.txt` is the outlined `CURSOR` figlet. Front matter
  can set `fontSize`, `lineHeight`, and `height` (used to vertically
  center the letters next to the cube).
- `src/typing-line.txt` is a looping typewriter. Split phrases with `# ---`.

Front matter (lines starting with `# key: value`) sets title, font size, and
timing. Frame animations use `# kind: frames`, `# fps:`, and separate frames
with `# ---`.
