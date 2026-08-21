# Homepage assets

The profile README shows:

- one lockup SVG (`cursor-lockup.svg`) with the official Cursor 2.5D cube
  and the outlined `CURSOR` wordmark on a single row
- a one-line status that says the page is currently building with Cursor

Cube and wordmark are combined into one image so GitHub cannot stack them.
GitHub README CSS turns `<img width height>` into block-level images, which
wraps two side-by-side logos onto two rows.

## Show on the homepage

`README.md` embeds these files. Keep the image paths rooted at this
folder, and embed the lockup as a single image:

```html
<img src="ascii/cursor-lockup.svg" alt="Cursor" />
<img src="ascii/typing-line.svg" alt="building with Cursor" />
```

`cursor-lockup.svg` is generated from `cursor-cube-25d.svg` plus
`cursor-wordmark.svg`. The cube uses inline `fill` colors (not a `<style>`
block) so GitHub does not strip the 2.5D shading.

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
