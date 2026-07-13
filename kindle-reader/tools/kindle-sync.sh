#!/usr/bin/env bash
#
# kindle-sync — auto-convert Kindle files to EPUB for Word Runner.
#
# Drop .azw3/.azw/.mobi/.kfx/.prc files into the INBOX; this strips DRM
# (via Calibre + the DeDRM plugin, which hooks Calibre's import path) and
# writes a clean .epub into OUTBOX. Point OUTBOX at a cloud-synced folder
# (iCloud Drive / Google Drive / Dropbox) and the books follow you to your
# phone, where you load them with the app's "Choose files…" button.
#
# Requirements: Calibre (provides `ebook-convert`) + DeDRM plugin installed,
# with your Kindle serial(s) added. See ../IMPORTING-KINDLE-BOOKS.md.
#
# Usage:
#   ./kindle-sync.sh                 # one pass, then exit
#   ./kindle-sync.sh --watch         # keep running, poll every 10s
#   IN=~/Kindle OUT=~/Books ./kindle-sync.sh --watch
#
set -euo pipefail

IN="${IN:-$HOME/Kindle-Inbox}"
OUT="${OUT:-$HOME/Word-Runner-Books}"
INTERVAL="${INTERVAL:-10}"
WATCH=0
[[ "${1:-}" == "--watch" ]] && WATCH=1

if ! command -v ebook-convert >/dev/null 2>&1; then
  echo "error: 'ebook-convert' not found. Install Calibre and make sure its"
  echo "       command-line tools are on your PATH (macOS: /Applications/calibre.app/Contents/MacOS)."
  exit 1
fi

mkdir -p "$IN" "$OUT"
echo "kindle-sync"
echo "  inbox : $IN"
echo "  outbox: $OUT"
echo "  mode  : $([[ $WATCH -eq 1 ]] && echo "watching (every ${INTERVAL}s, Ctrl-C to stop)" || echo "single pass")"
echo

convert_pass() {
  local converted=0 skipped=0 failed=0
  shopt -s nullglob nocaseglob
  for src in "$IN"/*.azw3 "$IN"/*.azw "$IN"/*.mobi "$IN"/*.kfx "$IN"/*.prc; do
    [[ -e "$src" ]] || continue
    local base; base="$(basename "${src%.*}")"
    local dst="$OUT/$base.epub"
    # Skip if an up-to-date EPUB already exists.
    if [[ -f "$dst" && "$dst" -nt "$src" ]]; then
      skipped=$((skipped+1)); continue
    fi
    printf '→ %s ... ' "$(basename "$src")"
    if ebook-convert "$src" "$dst" >/dev/null 2>/tmp/kindle-sync.err; then
      echo "ok"; converted=$((converted+1))
    else
      echo "FAILED"; failed=$((failed+1))
      sed 's/^/    /' /tmp/kindle-sync.err | tail -n 4
      echo "    (if this says DRM: add the file's Kindle serial in the DeDRM plugin, then retry)"
      rm -f "$dst"
    fi
  done
  shopt -u nullglob nocaseglob
  echo "done: $converted converted, $skipped up-to-date, $failed failed"
}

if [[ $WATCH -eq 1 ]]; then
  while true; do
    convert_pass
    sleep "$INTERVAL"
  done
else
  convert_pass
fi
