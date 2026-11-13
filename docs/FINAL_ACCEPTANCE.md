# v1.0.0 final acceptance

## Tested environment

Windows 11 build 26300, Node.js 24.21.0 and PowerShell 7.6.9. Lively Wallpaper 2.2.1.0 and WebView2 Runtime 157.0.4341.46 were detected. Installer and Codex tests ran in disposable Codex home and LocalAppData directories. The native model provider returned a local fixture and the native tool was a read-only local MCP fixture.

## Acceptance results

| Area | Result | Evidence |
| --- | --- | --- |
| Windows 11 install and rollback | Passed in isolation | Read-only Plan, explicit approval, merge, documented Start, repeat install and Disable, Uninstall, original absent-file restoration, invalid JSON refusal. Existing Hook definitions and inline config were preserved. Disable left the bridge serving and the separate ambient mode still worked. |
| Native Codex event discovery | Passed in isolation | Two isolated projects each discovered eight async, one-second definitions requiring trust. Only the test profile received trust records. |
| Native tool to visual feedback | Passed | The isolated Codex instance completed one tool invocation. The bridge received one each of `UserPromptSubmit`, `PreToolUse`, `PostToolUse` and `Stop`, plus two each of `PreModelRequest` and `PostModelRequest` in the instrumented run. Chromium drew the beam and completion wave. The rendered page contained no audio elements. Lively received the candidate stream during a separate native tool run. |
| Multiple sessions, deduplication and recovery | Passed with fixtures | Independent sessions, duplicate tool edges, 30-second activity decay, a new SSE connection and fresh state after a bridge restart were verified. Events sent while the bridge is stopped are dropped. |
| Bridge unavailable | Passed in isolation | The native Codex instance completed the same read-only tool turn with the bridge stopped. The already loaded Canvas continued drawing and its SSE client detected the disconnect. Node's environment proxy settings did not redirect Hook delivery. |
| Wallpaper viewer closed | Passed at the SSE client level | Closing a viewer connection left the bridge accepting events and a new viewer received a snapshot. The observation window for switching away from the candidate in Lively elapsed without observing a disconnect. |
| Codex exit during an active turn | Passed in isolation | Ending the isolated native Codex process mid-tool left the bridge and wallpaper page available. No artificial `Stop` appeared. An active turn without a terminal event expires after 15 minutes. |
| Lively WebView2 desktop | Passed on Windows 11 | The candidate was applied as the actual desktop wallpaper. Lively's WebView2 reconnected after a bridge restart. The app returned two different desktop wallpaper frames and a frame after a native tool run. Desktop captures were deleted after verification. |
| Windows 10 | Unverified | No Windows 10 test environment was available. |
| Release inventory, privacy and licensing | Passed | An isolated Git and ZIP dry run verified all 29 allowlisted files, the pinned renderer and license, required notices, local documentation links and checksum generation. A content scan found no matching personal paths, account addresses or common credential patterns. The archive contained no runtime, log, key, user config or unreviewed demo capture. |

## Release decision

The candidate is ready for repository review and a release with Windows 11 as the verified platform. Report Windows 10 as unverified until an actual Windows 10 run is recorded. The release draft, media placeholders, reviewed inventory and packaging steps are ready for review. [Release plan](RELEASE.md) · [Release notes](RELEASE_NOTES_v1.0.0.md) · [Media placeholders](media/README.md)
