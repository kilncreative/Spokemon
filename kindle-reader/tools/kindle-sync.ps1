# kindle-sync (Windows PowerShell) — auto-convert Kindle files to EPUB.
#
# Drop .azw3/.azw/.mobi/.kfx/.prc into $In; this strips DRM via Calibre +
# the DeDRM plugin and writes a clean .epub to $Out. Point $Out at a
# cloud-synced folder to reach your phone. See ..\IMPORTING-KINDLE-BOOKS.md.
#
# Usage:
#   .\kindle-sync.ps1                 # one pass
#   .\kindle-sync.ps1 -Watch          # keep running, poll every 10s
#   .\kindle-sync.ps1 -In C:\Kindle -Out C:\Books -Watch

param(
  [string]$In  = "$HOME\Kindle-Inbox",
  [string]$Out = "$HOME\Word-Runner-Books",
  [int]$Interval = 10,
  [switch]$Watch
)

$convert = (Get-Command ebook-convert -ErrorAction SilentlyContinue)
if (-not $convert) {
  $guess = "C:\Program Files\Calibre2\ebook-convert.exe"
  if (Test-Path $guess) { $convert = $guess } else {
    Write-Error "ebook-convert not found. Install Calibre and add it to PATH."
    exit 1
  }
}
$exe = if ($convert -is [string]) { $convert } else { $convert.Source }

New-Item -ItemType Directory -Force -Path $In, $Out | Out-Null
Write-Host "kindle-sync`n  inbox : $In`n  outbox: $Out"

function Convert-Pass {
  $c = 0; $s = 0; $f = 0
  Get-ChildItem -Path $In -Include *.azw3,*.azw,*.mobi,*.kfx,*.prc -File -Recurse:$false |
  ForEach-Object {
    $dst = Join-Path $Out ($_.BaseName + ".epub")
    if ((Test-Path $dst) -and ((Get-Item $dst).LastWriteTime -ge $_.LastWriteTime)) { $s++; return }
    Write-Host ("-> {0} ... " -f $_.Name) -NoNewline
    & $exe $_.FullName $dst *> $env:TEMP\kindle-sync.err
    if ($LASTEXITCODE -eq 0) { Write-Host "ok"; $c++ }
    else {
      Write-Host "FAILED"; $f++
      Get-Content $env:TEMP\kindle-sync.err -Tail 4 | ForEach-Object { "    $_" }
      Write-Host "    (if this says DRM: add the file's Kindle serial in the DeDRM plugin, then retry)"
      Remove-Item $dst -ErrorAction SilentlyContinue
    }
  }
  Write-Host "done: $c converted, $s up-to-date, $f failed"
}

if ($Watch) { while ($true) { Convert-Pass; Start-Sleep -Seconds $Interval } }
else { Convert-Pass }
