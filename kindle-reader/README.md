# Word Runner — a Kindle-styled speed reader

A clean, minimal web app that displays your books one word at a time (RSVP /
"word runner" reading) with the same look-and-feel options as the Kindle app —
themes, typefaces, size, contrast, and pacing you can tune to taste.

Single file. No build step. No server. No network. **Open `index.html` in any
modern browser** and read.

## What it does

- **Word runner (RSVP) reading** with an ORP "focus letter" (the red pivot) so
  your eyes stay fixed on one point instead of scanning across lines.
- **Import books you own** — drag-and-drop or pick an **EPUB** or **TXT** file,
  or paste text. EPUBs are unzipped and parsed entirely in the browser, keeping
  chapter structure.
- **Local library** — imported books and your reading position are saved on your
  device (IndexedDB). Nothing is ever uploaded.

## Reading experience controls

- **Themes** — White, Sepia, Green, and Black, matching the Kindle app palettes.
- **Typefaces** — Bookerly, Amazon Ember, Georgia, Palatino, Baskerville,
  Helvetica, Lato, and OpenDyslexic (with web-safe fallbacks).
- **Speed** — 100–1000 wpm.
- **Font size**, **weight**, **letter spacing**, and **contrast**.
- **Words per flash** — 1–4 words at a time.
- **Focus letter (ORP)** and **guide rails** toggles.
- **Pause on punctuation** and **slow down long words** for natural rhythm.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Back / forward one sentence |
| `↑` / `↓` | Speed up / slow down |
| `L` | Library & import |
| `S` | Reading settings |
| `Esc` | Close panels |

## About connecting an Amazon / Kindle account

Amazon does **not** provide a public API to sign in and stream your Kindle
library, and Kindle books are DRM-protected, so no web app can pull that content
directly. Instead, import books you own as **EPUB** or **TXT** — for example
titles from Project Gutenberg, files exported with Calibre, or your own
documents — and they read beautifully here. All processing stays on your device.

## Run it

Just open the file:

```bash
open kindle-reader/index.html        # macOS
xdg-open kindle-reader/index.html    # Linux
```

Or serve the folder statically (`npx serve kindle-reader`) and visit it.
