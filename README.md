# Word Runner — a Kindle-styled speed reader

A clean, minimal web app that displays your books one word at a time (RSVP /
"word runner" reading) with the same look-and-feel options as the Kindle app —
themes, typefaces, size, contrast, and pacing you can tune to taste.

Single file. No build step. No server. No network. **Open `index.html` in any
modern browser** and read.

## What it does

- **Word runner (RSVP) reading** with an ORP "focus letter" (the red pivot) so
  your eyes stay fixed on one point instead of scanning across lines.
- **Import books you own** — drag-and-drop or pick a **PDF, EPUB, AZW3, AZW,
  MOBI**, or **TXT** file (one or many), import a whole folder, or paste text.
  Everything (PDF text extraction via a vendored Mozilla pdf.js, EPUB unzip,
  MOBI/AZW3 PalmDOC decompression) is parsed entirely in the browser, keeping
  chapter structure. PDFs use their bookmarks as chapters.
- **Library** — every imported book is saved on-device (IndexedDB) with your
  place in it; reopen any time and it resumes where you left off.
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

## Getting your Kindle books in

Word Runner reads Kindle's own **AZW3 / AZW / MOBI** formats directly, plus
**EPUB** and **TXT**. Amazon wraps purchased books in DRM, so a purchased file
needs one prep step — stripping the DRM with **Calibre + the DeDRM plugin** using
your own account/device key, then importing the result.

**See [IMPORTING-KINDLE-BOOKS.md](IMPORTING-KINDLE-BOOKS.md) for the exact
step-by-step.** All processing stays on your device; nothing is uploaded.

## Run it

Just open the file:

```bash
open kindle-reader/index.html        # macOS
xdg-open kindle-reader/index.html    # Linux
```

Or serve the folder statically (`npx serve kindle-reader`) and visit it.
