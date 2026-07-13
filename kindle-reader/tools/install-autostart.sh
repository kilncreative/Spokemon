#!/usr/bin/env bash
#
# install-autostart — run kindle-sync in the background at login.
#
# macOS  -> a launchd LaunchAgent (~/Library/LaunchAgents)
# Linux  -> a systemd --user service (~/.config/systemd/user)
#
# Override the folders like:
#   IN=~/Kindle-Inbox OUT=~/Dropbox/Books ./install-autostart.sh
#
# Undo:
#   macOS:  launchctl unload -w ~/Library/LaunchAgents/com.wordrunner.kindle-sync.plist
#   Linux:  systemctl --user disable --now kindle-sync.service
#
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC="$DIR/kindle-sync.sh"
IN="${IN:-$HOME/Kindle-Inbox}"
OUT="${OUT:-$HOME/Word-Runner-Books}"
INTERVAL="${INTERVAL:-10}"
LABEL="com.wordrunner.kindle-sync"

[[ -f "$SYNC" ]] || { echo "error: kindle-sync.sh not found next to this script"; exit 1; }
chmod +x "$SYNC"
mkdir -p "$IN" "$OUT"

case "$(uname -s)" in
  Darwin)
    # Make sure launchd (which has a minimal PATH) can find Calibre's CLI.
    CAL="/Applications/calibre.app/Contents/MacOS"
    PATHV="$CAL:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
    if ! PATH="$PATHV" command -v ebook-convert >/dev/null 2>&1; then
      echo "warning: ebook-convert not found on the expected paths."
      echo "         Install Calibre first; the agent will keep retrying once it's present."
    fi
    PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
    mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
    cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SYNC</string>
    <string>--watch</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>IN</key><string>$IN</string>
    <key>OUT</key><string>$OUT</string>
    <key>INTERVAL</key><string>$INTERVAL</string>
    <key>PATH</key><string>$PATHV</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/$LABEL.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/$LABEL.log</string>
</dict>
</plist>
PLISTEOF
    launchctl unload -w "$PLIST" >/dev/null 2>&1 || true
    launchctl load -w "$PLIST"
    echo "Installed launchd agent: $PLIST"
    echo "  inbox : $IN"
    echo "  outbox: $OUT"
    echo "  log   : $HOME/Library/Logs/$LABEL.log"
    ;;

  Linux)
    UNIT_DIR="$HOME/.config/systemd/user"
    UNIT="$UNIT_DIR/kindle-sync.service"
    mkdir -p "$UNIT_DIR"
    cat > "$UNIT" <<UNITEOF
[Unit]
Description=Word Runner kindle-sync (auto-convert Kindle files to EPUB)
After=default.target

[Service]
Type=simple
Environment=IN=$IN
Environment=OUT=$OUT
Environment=INTERVAL=$INTERVAL
ExecStart=/bin/bash $SYNC --watch
Restart=on-failure
RestartSec=30

[Install]
WantedBy=default.target
UNITEOF
    if command -v systemctl >/dev/null 2>&1; then
      systemctl --user daemon-reload
      systemctl --user enable --now kindle-sync.service
      # Keep it running even when you're not logged in (optional but handy).
      loginctl enable-linger "$(id -un)" >/dev/null 2>&1 || true
      echo "Installed + started systemd --user service: $UNIT"
      echo "  status: systemctl --user status kindle-sync.service"
      echo "  logs  : journalctl --user -u kindle-sync.service -f"
    else
      echo "Wrote $UNIT, but systemctl isn't available."
      echo "Enable it on a systemd machine with:"
      echo "  systemctl --user enable --now kindle-sync.service"
    fi
    echo "  inbox : $IN"
    echo "  outbox: $OUT"
    ;;

  *)
    echo "Unsupported OS: $(uname -s). On Windows, use Task Scheduler to run"
    echo "tools/kindle-sync.ps1 -Watch at logon."
    exit 1
    ;;
esac
echo "Done. Drop Kindle files into the inbox and converted EPUBs appear in the outbox."
