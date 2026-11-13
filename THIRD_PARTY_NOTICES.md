# Third-party notices

| Component | Source and distribution |
| --- | --- |
| HALOFLUX desktop Canvas and interface | `upstream/haloflux/lab.html` comes from Ryder191's commit `02174503d0f391b1bb2537b8cad75e8e5f9997f2`. The original license and copyright notices are reproduced verbatim in [LICENSE](LICENSE). [Upstream revision](https://github.com/Ryder191/haloflux/tree/02174503d0f391b1bb2537b8cad75e8e5f9997f2) |
| Original soundtrack | The upstream notice credits The Cynic Project / cynicmusic and describes `sw421k.mp3` as CC0. The community package omits the audio asset and disables audio initialization. |
| Fonts | The adapter removes the upstream remote JetBrains Mono stylesheet. The package includes no font binaries and uses local fallback fonts. |
| Node.js and PowerShell | User-supplied runtimes with their own MIT and bundled-component notices. The installer makes a private local copy of the user's signed Node.js executable for Hook execution. [Node.js license and notices](https://github.com/nodejs/node/blob/v24.21.0/LICENSE) · [PowerShell license](https://github.com/PowerShell/PowerShell/blob/master/LICENSE.txt) |
| Codex, Lively Wallpaper and WebView2 | Separately installed applications and runtimes, governed by their respective terms. The source and release package contain no executable or dependency bundle. [Lively project and license](https://github.com/lively-community/lively) · [WebView2 Runtime](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution) |
| DSH adaptations and Agentic Wallpaper | References listed in [CREDITS](CREDITS.md). The release contains no files or copied code from these projects. |

The adapter adds local activity state, suppresses audio and removes remote font requests when serving the upstream page. Distribution of the resulting wallpaper and project is under the noncommercial terms and notices in [LICENSE](LICENSE).
