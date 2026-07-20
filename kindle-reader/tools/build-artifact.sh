#!/usr/bin/env bash
#
# build-artifact — produce a wrapper-free fragment (style + body content, pdf.js
# inlined) suitable for publishing as a Claude artifact, which supplies its own
# <!doctype>/<head>/<body>. Same app, just without the outer document tags.
#
# Usage: ./tools/build-artifact.sh [output.html]
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/index.html"
PDF="$ROOT/vendor/pdf.min.js"
WRK="$ROOT/vendor/pdf.worker.min.js"
OUT="${1:-$ROOT/dist/word-runner.artifact.html}"

for f in "$SRC" "$PDF" "$WRK"; do [[ -f "$f" ]] || { echo "missing: $f"; exit 1; }; done
mkdir -p "$(dirname "$OUT")"

awk -v pdf="$PDF" -v wrk="$WRK" '
  /<!DOCTYPE/ || /<html / { next }
  /<head>/  { inhead=1; next }
  /<\/head>/ { inhead=0; next }
  /<body>/  { inbody=1; next }
  /<\/body>/ { inbody=0; next }
  /<\/html>/ { next }
  inhead && /<style>/ { instyle=1 }
  inhead && instyle   { print; if ($0 ~ /<\/style>/) instyle=0; next }
  inhead { next }                       # drop metas, title, link icons
  inbody && /<!-- PDFJS:START -->/ {
    print "<script>window.__PDF_INLINE=1;</script>";
    print "<script>"; while ((getline l < pdf) > 0) print l; close(pdf); print "</script>";
    print "<script>"; while ((getline l < wrk) > 0) print l; close(wrk); print "</script>";
    pskip=1; next
  }
  inbody && /<!-- PDFJS:END -->/ { pskip=0; next }
  inbody && pskip!=1 { print }
' "$SRC" > "$OUT"

echo "wrote $OUT ($(( $(wc -c < "$OUT") / 1024 )) KB)"
echo "  first line : $(head -1 "$OUT")"
echo "  last line  : $(tail -1 "$OUT")"
echo "  wrapper tags present (should be 0): $(grep -cE '<!DOCTYPE|<html |<head>|<body>' "$OUT" || true)"