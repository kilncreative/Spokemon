# Getting your Kindle books into Word Runner

Word Runner reads **EPUB, AZW3, AZW, MOBI, and TXT**. The only snag with Kindle
purchases is that Amazon wraps them in DRM, so a purchased file has to have that
DRM removed once — using your own account/device key — before any reader other
than Amazon's can open it. This is a one-time prep per book. After it, the file
drops straight into the app.

The whole job is done with **Calibre** (free desktop app) plus the **DeDRM
plugin**. Below is the fast path.

---

## 1. Get the book file onto your computer

Pick whichever you have:

- **From a Kindle e-reader (most reliable):** plug the Kindle in by USB, open its
  `documents` folder, and copy the `.azw3` / `.azw` files to your computer. The
  DRM on these is tied to the device **serial number** (you'll enter it in step 3).
- **From the Kindle desktop app:** install **Kindle for PC/Mac** and download your
  books in it. Use an **older version (1.17 / 1.24 or earlier)** if you can —
  newer versions store books as KFX with stronger DRM that's fussier to strip.
  The books land in a `My Kindle Content` folder as `.azw`/`.kfx`.
- **"Download & transfer via USB" on the Amazon site:** *Manage Your Content and
  Devices → the book → More actions → Download & transfer via USB.* Amazon has
  been removing this option for many accounts, so it may not appear — if it's
  gone, use one of the two methods above.

> Personal documents you sent to your Kindle (your own PDFs/DOCs via
> Send-to-Kindle) are usually **DRM-free already** — skip straight to step 4.

## 2. Install Calibre + the DeDRM plugin

1. Install **Calibre**: <https://calibre-ebook.com>
2. Download the **DeDRM_tools** release zip: <https://github.com/noDRM/DeDRM_tools/releases>
   (grab `DeDRM_tools_x.x.x.zip` and unzip it).
3. In Calibre: **Preferences → Plugins → Load plugin from file** → choose
   `DeDRM_plugin.zip` from inside that unzipped folder → restart Calibre.
4. *(Only if your books are KFX)* also install the **KFX Input** plugin:
   *Preferences → Plugins → Get new plugins → search "KFX Input" → install.*

## 3. Give DeDRM your key

**Preferences → Plugins →** double-click **DeDRM** → **Kindle eInk ebooks** (for
USB / e-reader files) → **＋** → type your **Kindle's serial number**
(*Settings → Device Options → Device Info* on the Kindle, or on its box). Add
every device you read on. For Kindle-for-PC files, the plugin reads the key from
the app automatically — nothing to enter.

## 4. Strip DRM and export

1. Drag the `.azw3` / `.azw` / `.kfx` file into Calibre's library. **DeDRM runs
   automatically on import** — if it succeeds, the book appears with no errors.
   (If you get a DRM error here, the key in step 3 doesn't match the file's
   device — add the right serial and re-import.)
2. Get a clean file out, either:
   - **EPUB (safest):** right-click the book → **Convert books → Convert
     individually** → *Output format: EPUB* → OK. Then right-click → **Save to
     disk → Save only EPUB format to disk**.
   - **or the de-DRM'd Kindle file:** right-click → **Save to disk** → you'll get
     a DRM-free `.azw3`, which Word Runner also reads directly.

## 5. Load it into Word Runner

Open **📚 Library** in the app → **drop the file in** (or *Choose a file…*).
It's parsed on your device, saved locally, and ready to run. Nothing is uploaded.

---

## Automating it

What can and can't be automated, honestly:

| Step | Automatable? |
| --- | --- |
| Downloading purchases off Amazon | **No, not cleanly.** Amazon dropped "Download & transfer via USB" for most accounts in 2025 and has no official API. You copy files off a Kindle over USB or the desktop app. |
| Stripping DRM + converting to EPUB | **Yes** — a watch-folder script (below). |
| Loading a whole library into the app | **Yes** — the app's bulk / folder import. |

### 1. Auto-convert with a watch folder

`tools/kindle-sync.sh` (macOS/Linux) and `tools/kindle-sync.ps1` (Windows) watch
an **inbox** folder and convert anything you drop in — DRM stripped, clean EPUB
out — into an **outbox** folder. Nothing manual per book.

```bash
# macOS / Linux — keep it running; drop Kindle files into the inbox anytime
IN=~/Kindle-Inbox OUT=~/Word-Runner-Books ./tools/kindle-sync.sh --watch
```
```powershell
# Windows
.\tools\kindle-sync.ps1 -In C:\Kindle-Inbox -Out C:\Word-Runner-Books -Watch
```

Requires Calibre + DeDRM installed with your Kindle serial (steps 2–3). To run
it on login, add it to your startup items / Task Scheduler / a `launchd` or
`systemd --user` unit.

### 2. Let the books follow you to your phone

Point the **outbox** at a cloud-synced folder — **iCloud Drive**, **Google
Drive**, **Dropbox**, or **Syncthing**. Converted EPUBs then appear in the Files
app on your phone automatically.

### 3. Bulk-import into the app

- **On a computer (Chrome/Edge):** Library → **Import folder…** → pick the
  outbox once. Every book in it is imported in one go.
- **Anywhere, incl. phone:** Library → **Choose files…** → multi-select the
  EPUBs (from the Files app on iOS/Android). Or drag a pile of files onto the
  window.

So the steady-state loop is: copy new purchases into the inbox → they auto-convert
and cloud-sync → open the app and multi-select. The only unavoidable manual part
is getting the files off Amazon in the first place.

If a specific file still reports DRM from the script, add it through the Calibre
GUI once (which definitely triggers DeDRM), then re-run.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| App says *"still has DRM"* | The file wasn't de-DRM'd. Run it through Calibre (steps 3–4) and import the output. |
| App says *"HUFF/CDIC compression"* | It's a DRM-free MOBI the browser can't unpack. Convert it to EPUB in Calibre and import that. |
| Calibre import throws a DRM error | Serial/key in step 3 doesn't match the file's device. Add the correct Kindle serial and re-import. |
| Book is KFX and won't import | Install the **KFX Input** plugin (step 2.4), then re-import. |
| Newer Kindle-for-PC won't de-DRM | Uninstall it and install an **older 1.x** version, re-download the book, try again. |

Everything here runs locally on your machine. The books are yours; this just
changes the wrapper so you can read them where you like.
