# Codex-HaloFlux

A silent Windows live wallpaper that turns local Codex tool and task events into light around the original HALOFLUX ring.

> **Community project · Noncommercial use only**  
> Based on **HALOFLUX by Ryder191 (RYDER CODE / Ms MAIKEBAIs CAT)**. Ryder191 created the original Canvas renderer, ring, beams, particles, data panels and camera motion. Codex-HaloFlux extends that work with local Codex event integration and Windows deployment. This project is independent and has no OpenAI or upstream endorsement. [Original HALOFLUX](https://github.com/Ryder191/haloflux)

[简体中文](README.zh-CN.md) · [Demo media](docs/media/README.md) · [Install](docs/INSTALL.md) · [Uninstall and recovery](docs/UNINSTALL.md) · [FAQ](docs/FAQ.md)

## Features

- **Real Codex activity.** A submitted prompt can trigger a pulse, an observed tool start can launch a beam, and `Stop` sends an outward wave. The animation smooths transitions. The original data panels remain decorative.
- **Original HALOFLUX visuals.** The desktop Canvas source is preserved at a pinned revision. The served page uses a small adapter for event feedback, silence and local font fallback.
- **Local, minimized data.** A Node.js bridge binds only to `127.0.0.1`. The forwarder sends an event type, time, keyed pseudonyms for correlation and a model request outcome when present. Prompts, code and tool input/output stay out of the bridge. No extra model API or key is required.
- **Independent wallpaper.** Use ambient mode without Codex. Optional event Hooks run asynchronously with a one-second Codex timeout. Hook processes have a startup cost, and an unavailable bridge drops events.
- **Reversible setup.** The installer backs up and merges user-scope Hook JSON after approval. A separate Codex trust review enables the commands. Disable and uninstall remove the matching HaloFlux entries.

[Evidence and compatibility](docs/FINAL_ACCEPTANCE.md) · [Privacy and security](SECURITY.md)

## What's New in Codex-HaloFlux

- Codex Hooks intake, privacy filtering and a signed, loopback-only SSE bridge.
- Per-session activity, tool-edge deduplication and a 30-second activity window that modulates ring, particle and beam movement during active turns.
- Canvas event overlays, quiet ambient mode, Lively WebView2 setup and isolated Windows regression checks.
- PowerShell preview, opt-in installation, scoped disable and uninstall, and private configuration backups.

See [module provenance and credits](CONTRIBUTIONS.md) for the upstream renderer, independent additions and reference projects.

## How it works

Codex Hooks → local forwarder → signed loopback request → activity state → SSE → Canvas. [Architecture and extension points](docs/ARCHITECTURE.md)

## Set up on Windows

Windows 11 is the verified platform. Download official Windows Node.js (24 LTS was tested). For event mode, also install PowerShell 7.4+ and use a current native Codex Desktop build with asynchronous Hooks. For desktop display, install Lively and use its WebView2 web player. [Node.js](https://nodejs.org/en/download) · [PowerShell](https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows) · [Lively](https://github.com/lively-community/lively/wiki/Getting-Started)

1. Extract the reviewed Windows ZIP, open its folder in PowerShell, and run `node .\server.mjs` for **ambient mode**. Open `http://127.0.0.1:49371/wallpaper`. This variant preserves the desktop visual baseline, serves it locally, and omits the upstream soundtrack and remote font.
2. For **Codex activity**, run `.\Manage-Hooks.ps1 -Action Plan` in PowerShell 7. Review the absolute paths and eight Hook definitions. If you approve, run `.\Manage-Hooks.ps1 -Action Install -Approve`. The installer merges into user-scope `hooks.json`, creates private backups and copies the runtime to a private per-user directory. The commands require a normal user account.
3. In Codex Desktop **Settings → Hooks**, review and trust the eight entries. Run `.\Manage-Hooks.ps1 -Action Start` and leave the terminal open. Open the printed URL, normally `http://127.0.0.1:49373/wallpaper`. In a new local Codex chat, run a read-only tool task. Check for a beam and completion wave or check `/hook-status` at the same address.
4. In Lively, set the web player to WebView2. Choose **Add Wallpaper**, enter the active URL as a website, then apply it. The bridge remains in its own terminal and the browser preview can close.
5. Press **Ctrl+C** to stop the bridge or select a different wallpaper in Lively to stop display. Run `.\Manage-Hooks.ps1 -Action Disable` to remove only the project Hooks. Use `-Action Uninstall` after stopping the bridge to remove the installed runtime. The rollback guide covers retained backups, manual recovery and keeping ambient mode.

[Full installation](docs/INSTALL.md) · [Uninstall and recovery](docs/UNINSTALL.md) · [Troubleshooting](docs/FAQ.md)

## Compatibility & Known Limitations

| Scope | Evidence |
| --- | --- |
| Windows 11 and Lively WebView2 | Tested on the actual desktop, including bridge restart/reconnect and distinct wallpaper frames. Some Lively switch-away and exit cases remain partially covered. |
| Native Codex tool feedback | A real native Codex process invoked a local read-only MCP fixture using a local test model response. Tool start, tool completion and task stop reached the bridge. Chromium showed beam/wave drawing and Lively was separately verified during a native tool run. This covers the tested tool path. |
| Install, rollback, concurrent sessions and outage | Verified in disposable Windows configuration. Multi-session deduplication, inactivity expiry and reconnect behavior use controlled fixtures. Native tool execution also completed with the bridge stopped. |
| Windows 10 and other Codex versions | Unverified beyond the recorded environment. |
| macOS and Linux | Outside the v1.0.0 Windows installer and desktop support scope. |
| Hidden reasoning, machine-wide idle and complete tool timeline | Unavailable. The display derives activity from received Hooks and may miss late, unsupported or undelivered events. |

[Exact test environment and coverage](docs/FINAL_ACCEPTANCE.md) · [Known limitations](docs/KNOWN_LIMITATIONS.md)

## Privacy, performance and development

The bridge keeps minimized state in memory. Other software on the same machine can read the loopback SSE and status routes. Use ambient mode when activity timing itself is sensitive. The original Canvas console is available at `/`; the tuning guide explains render resolution, particle counts, glow and measuring 4K costs. [Security](SECURITY.md) · [Performance tuning](docs/PERFORMANCE_TUNING.md)

Issues and pull requests are welcome. See [contributing](CONTRIBUTING.md), [development](docs/DEVELOPMENT.md) and the [roadmap](docs/ROADMAP.md).

## License and credits

Redistribution follows the [original LICENSE](LICENSE) and [NOTICE](NOTICE), including the PolyForm Noncommercial License 1.0.0, original credit and applicable republication conditions. Include the original author and source in visible screenshot, video and wallpaper listing descriptions. [Credits](CREDITS.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)
