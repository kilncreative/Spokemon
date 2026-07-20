#!/usr/bin/env bash
#
# build-standalone — inline pdf.js into index.html to produce ONE self-contained
# HTML file (no vendor/ folder, no network). pdf.js then runs on the main thread
# via window.pdfjsWorker. Used for hosts that want a single file (e.g. a Claude
# artifact) and as an offline "save one file and read anywhere" build.
#
# Usage: ./tools/build-standalone.sh [output.html]
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/index.html"
PDF="$ROOT/vendor/pdf.min.js"
WRK="$ROOT/vendor/pdf.worker.min.js"
OUT="${1:-$ROOT/dist/word-runner.html}"

for f in "$SRC" "$PDF" "$WRK"; do [[ -f "$f" ]] || { echo "missing: $f"; exit 1; }; done
mkdir -p "$(dirname "$OUT")"

awk -v pdf="$PDF" -v wrk="$WRK" '
  /<!-- PDFJS:START -->/ {
    print "<script>window.__PDF_INLINE=1;</script>";
    print "<script>"; while ((getline l < pdf) > 0) print l; close(pdf); print "</script>";
    print "<script>"; while ((getline l < wrk) > 0) print l; close(wrk); print "</script>";
    skip = 1; next
  }
  /<!-- PDFJS:END -->/ { skip = 0; next }
  skip != 1 { print }
' "$SRC" > "$OUT"

bytes=$(wc -c < "$OUT")
echo "wrote $OUT ($(( bytes / 1024 )) KB, self-contained)"
