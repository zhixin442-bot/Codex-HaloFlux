# Install on Windows

## Prerequisites

Use an official Windows build of Node.js 22, 24 or 26. Prefer the signed Node.js 24 LTS build. Windows 11 is tested. Windows 10 is a target with a smoke test still pending. Hook installation checks the OpenJS Foundation Authenticode signature and requires PowerShell 7.4+. Event mode needs a native Windows Codex Desktop version with asynchronous command Hooks and support for the listed events. The installer checks for the active Codex home and validates its Hook JSON. Confirm event availability and trust in Codex **Settings → Hooks**. Lively Wallpaper with WebView2 is optional. [Node.js downloads](https://nodejs.org/en/download) · [PowerShell installation](https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows) · [Codex Hooks documentation](https://learn.chatgpt.com/docs/hooks) · [Lively Web Player](https://github.com/lively-community/lively/wiki/Web-Player)

Extract the release ZIP to a writable folder and open PowerShell there. Use a normal Windows user account. If a downloaded script is blocked, review the files and release checksum. On a machine where policy permits, unblock this reviewed script with `Unblock-File -LiteralPath .\Manage-Hooks.ps1`. No machine-wide execution policy change is required.

## Pure wallpaper

```powershell
node .\server.mjs
```

Open `http://127.0.0.1:49371/wallpaper`. Open the same origin at `/` to access the original console using C or the CONSOLE control. The ambient server does not accept event submissions.

## Real activity

1. Run `.\Manage-Hooks.ps1 -Action Plan`. Review the exact generated PowerShell command, destination, port and eight event names. Use the same `-Port` for both Plan and Install if the default is occupied. Finish any other edits to `hooks.json` before installing.
2. To authorize the change, run `.\Manage-Hooks.ps1 -Action Install -Approve`. The installer appends one asynchronous matcher group for each event in `%USERPROFILE%\.codex\hooks.json` or `$env:CODEX_HOME\hooks.json`. The private runtime and backups are under `%LOCALAPPDATA%\Codex-HaloFlux-Community`. Existing inline TOML Hooks may produce Codex’s normal merge warning.
3. In Codex Desktop, open **Settings → Hooks** or **Review hooks** in the composer. Inspect and trust the eight definitions for the private runtime. Open a new chat after applying them. Managed policies or older clients can limit discovery and event coverage.
4. Run `.\Manage-Hooks.ps1 -Action Start` in a separate terminal and leave it open. Open the printed wallpaper URL, normally `http://127.0.0.1:49373/wallpaper`. The browser page at `/` shows bridge status and offers the original tuning console. Perform a read-only tool task in a local Codex project and look for the pulse, beam and outward wave.
5. Inspect `/hook-status` at the same address if the page remains idle. It contains minimized, in-memory counters. Use the same literal `127.0.0.1` address that Start prints. Check whether the eight entries show as trusted, whether another process owns the port, and whether Codex is running the task on the same Windows host.

Only one release installation per Windows user is supported. An existing HaloFlux entry in the user JSON or TOML is flagged for manual review. Remove any old project-level HaloFlux entries you own before adding the community Hooks if migrating an older deployment. The installer has no project-wide search. Other tools’ Hooks can remain installed.

## Lively Wallpaper

1. Install Lively from the Microsoft Store or the project's official installer. Open Lively, set its web player to WebView2, and use **Add Wallpaper** to add the loopback wallpaper URL as a website. Follow Lively's Web Player guide if the WebView2 runtime is missing. [Lively setup and downloads](https://github.com/lively-community/lively/wiki/Getting-Started) · [WebView2 setup](https://github.com/lively-community/lively/wiki/Web-Player)
2. Apply it from the Lively library. Keep the bridge terminal running. The browser can close because Lively opens its own WebView2 instance.
3. If the wallpaper is static while a full-screen app is open, check Lively's playback rules. For port changes, edit or re-add the URL. Bridge responses use `Cache-Control: no-store`.

See [stop, uninstall and rollback](UNINSTALL.md) for cleanup.
