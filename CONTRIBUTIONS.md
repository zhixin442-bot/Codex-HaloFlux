# Contributions and provenance

**HALOFLUX by Ryder191 (RYDER CODE / Ms MAIKEBAIs CAT)** is the original visual work. Ryder191 created the Canvas rendering, composition, ring, layered beams, particles, demo panels, beat timing and camera motion. Codex-HaloFlux's contribution is the Windows event integration, deployment and supporting engineering. [Original HALOFLUX](https://github.com/Ryder191/haloflux)

| Area | Classification and attribution | Source and verification |
| --- | --- | --- |
| Original desktop Canvas, visuals and tuning controls | Directly reused from Ryder191 | [Pinned lab.html](upstream/haloflux/lab.html) is byte-identical to the upstream Git blob. |
| Runtime page adaptation | Upstream-derived output with a Codex-HaloFlux adapter | [render-page.mjs](render-page.mjs) patches the served page in memory to add hooks into the frame loop, local CSS and mute behavior. |
| Codex lifecycle reception and validation | Codex-HaloFlux implementation using the documented Codex Hook contract | [forward-hook.mjs](forward-hook.mjs) and [hook-protocol.mjs](hook-protocol.mjs) handle the eight configured events, filtering, correlation and HMAC. |
| Windows HTTP bridge, SSE and reconnection | Codex-HaloFlux implementation using Node.js and browser APIs | [server.mjs](server.mjs) and [activity.js](activity.js) serve localhost snapshots, keep events in memory and reconnect. |
| Multi-session state, tool-edge deduplication and decay | Codex-HaloFlux implementation | [live-events.mjs](live-events.mjs) tracks turns, expires tool starts after 30 seconds and scopes completion to a turn. |
| Visual mapping and effects | Codex-HaloFlux controller integrated with the upstream renderer | [activity.js](activity.js) implements pulse, beam, wave and other visual responses. [render-page.mjs](render-page.mjs) connects them to original Canvas parameters and geometry. |
| Data minimization, silent ambient mode and fault isolation | Codex-HaloFlux implementation | The forwarder emits allowlisted metadata, the bridge has an ambient mode, and an already loaded Canvas continues on disconnect. |
| Installation, backup, disable, uninstall and recovery | Codex-HaloFlux implementation | [Manage-Hooks.ps1](Manage-Hooks.ps1) and [recovery steps](docs/UNINSTALL.md). |
| Windows 11 and Lively deployment, safety tests | Codex-HaloFlux integration and verification | [Installation](docs/INSTALL.md), [regression tests](tests/verify-windows.mjs) and [acceptance evidence](docs/FINAL_ACCEPTANCE.md). |
| DSH session-driven visuals and agent-hook wallpaper patterns | Design references | The Ke-wood, Michael-ZAG and DrMoussavie projects were consulted. Their source and assets are absent from this release. [Credits](CREDITS.md) |
| Windows 10, complete global status, other agent adapters and 4K optimizations | Unverified or outside v1.0.0 | [Known limitations](docs/KNOWN_LIMITATIONS.md) and [candidate roadmap](docs/ROADMAP.md). |

The distribution is governed by the upstream noncommercial license and notices. No separate license has been assigned to new modules for this release. Project attribution describes the sources and implementation scope. [LICENSE](LICENSE) · [NOTICE](NOTICE) · [Provenance audit](docs/PROVENANCE.md)
