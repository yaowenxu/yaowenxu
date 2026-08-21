# Homepage assets

The profile README shows:

- the official Cursor 2.5D cube (`cursor-cube-25d.svg`, from the Cursor brand kit)
- a one-line status that says the page is currently building with Cursor

## Show on the homepage

`README.md` embeds these files. Keep the image paths rooted at this
folder:

```html
<img src="ascii/cursor-cube-25d.svg" alt="Cursor" />
<img src="ascii/typing-line.svg" alt="building with Cursor" />
```

The cube uses inline `fill` colors (not a `<style>` block) so GitHub
does not strip the 2.5D shading.

## Add or edit the typing animation

1. Put character frames in `src/`.
2. Run `node ascii/generate.mjs`.
3. Commit both the source and the generated `.svg`.

`src/typing-line.txt` is a looping typewriter. Split phrases with `# ---`.

Front matter (lines starting with `# key: value`) sets title, font size, and
timing. Frame animations use `# kind: frames`, `# fps:`, and separate frames
with `# ---`.
