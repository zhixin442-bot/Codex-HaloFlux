# v1.0.0 prepublication audit

## Scope and evidence

The release uses the independent public candidate directory and the [release allowlist](RELEASE.md). Original HALOFLUX visuals are attributed to Ryder191. Codex-HaloFlux additions and design references are recorded separately. [Copyright and version audit](PROVENANCE.md) · [Contribution matrix](../CONTRIBUTIONS.md)

| Claimed advantage | Implementation and evidence |
| --- | --- |
| Original visuals with real event feedback | Pinned Canvas blob, in-memory adapter, actual native Codex tool event test and separately verified Lively WebView2 desktop frames. |
| Local and minimized activity | Loopback-only HTTP, direct client, HMAC validation, allowlisted event data, in-memory state and no new paid API. The installer creates a private local runtime. |
| Independent operation and graceful degradation | Ambient mode, native Codex tool success with bridge stopped, reconnect checks and independent bridge availability on isolated Codex exit. |
| Reversible setup | Read-only preview, explicit approval, private backup, group-level merge, repeatable disable/uninstall and rollback tests using disposable config. |
| Community development | Modular protocol, reducer and renderer adapter, isolated regression, extension and performance guides. |

[Detailed Windows evidence](FINAL_ACCEPTANCE.md) · [Limitations](KNOWN_LIMITATIONS.md) · [Security](../SECURITY.md)

## Clean checkout rehearsal

The allowlist contains 38 files. A temporary local repository used one fixture commit, a non-routable fixture author and committer address, and no inherited Git history. A fresh clone passed the documented Windows regression, including two-project discovery, proxy isolation, 30-second activity decay, restart and rollback with unrelated hooks retained. The ZIP rehearsal matched the tracked allowlist and produced a SHA-256 checksum. These tests used Windows 11 and disposable test configuration. The release candidate contains no generated Hook template or active user configuration. `Manage-Hooks.ps1` builds the definitions from a reviewable event list and displays the generated command in Plan.

The allowlist, local Markdown links, pinned license and renderer blobs, and Required Notice lines were checked. The content scan found no common credential patterns, personal paths, account addresses or private fixture markers. The directory and staged ZIP contain no private history, real event logs, binary dependencies or demo assets. Production commit identity and remote ownership remain unconfirmed.

## Release boundaries

- Windows 11 is the verified target. Windows 10 and additional Codex versions need separate testing. Lively switch-away and exit coverage is partial.
- Repository materials preserve the original noncommercial terms. Demo media is represented by placeholders until rights, attribution and privacy review are complete.
- Build the release only from the reviewed Git tree. Inspect author and committer metadata separately from the source scan. Approve the GitHub owner and a public commit identity before publishing.
- Repository creation, push, tag creation and Release publication require explicit owner approval. [Release plan and commands](RELEASE.md)
