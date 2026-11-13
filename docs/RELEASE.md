# GitHub release plan

1. Use only the public candidate directory as the repository root. Review the public commit identity and start with fresh Git history. Keep private checkouts, archives, configurations and test data outside the repository. Verify the staged files against the allowlist below and run a secret scan on contents and commit metadata.
2. Review the Windows compatibility results and open items in the final acceptance report. Reproduce the documented install, run, disable and uninstall in a clean Windows profile. [Acceptance report](FINAL_ACCEPTANCE.md)
3. Keep the original HALOFLUX attribution and noncommercial terms in the repository description and release notes. Verify the vendored files against the pinned Git revision. Review screenshots and video before adding them to the allowlist. [Release notes draft](RELEASE_NOTES_v1.0.0.md) · [Media placeholders](media/README.md)
4. After publication approval, tag the reviewed commit as `v1.0.0`. Verify the tagged inventory, produce the Windows ZIP and SHA-256 checksum, and review them in a draft GitHub release. Use the compatibility wording supported by the completed tests.

## Candidate allowlist

```text
.gitattributes
.gitignore
activity.css
activity.js
CHANGELOG.md
CONTRIBUTING.md
CONTRIBUTIONS.md
CREDITS.md
docs/ARCHITECTURE.md
docs/DEVELOPMENT.md
docs/FAQ.md
docs/FINAL_ACCEPTANCE.md
docs/INSTALL.md
docs/KNOWN_LIMITATIONS.md
docs/media/README.md
docs/PERFORMANCE_TUNING.md
docs/PREPUBLICATION_AUDIT.md
docs/PROVENANCE.md
docs/PUBLICITY.md
docs/RELEASE.md
docs/RELEASE_NOTES_v1.0.0.md
docs/ROADMAP.md
docs/UNINSTALL.md
forward-hook.mjs
hook-protocol.mjs
LICENSE
live-events.mjs
Manage-Hooks.ps1
NOTICE
README.md
README.zh-CN.md
render-page.mjs
SECURITY.md
server.mjs
tests/verify-windows.mjs
THIRD_PARTY_NOTICES.md
upstream/haloflux/lab.html
upstream/haloflux/LICENSE
```

Compare `git ls-files` before committing and `git ls-tree -r --name-only v1.0.0` before packaging with the reviewed list. Stop if they differ. Create assets outside the repository and compare the ZIP contents with the tagged list. No generated Hook configuration, backup, private runtime, event key, event log, browser profile or unreviewed media belongs in the tag or ZIP.

```powershell
git archive --format=zip --prefix=Codex-HaloFlux/ --output=../Codex-HaloFlux-v1.0.0-windows.zip v1.0.0
Get-FileHash -Algorithm SHA256 -LiteralPath ../Codex-HaloFlux-v1.0.0-windows.zip
```

## Isolated regression

Run `node .\tests\verify-windows.mjs` from the candidate directory. It creates its own temporary Codex home and LocalAppData and uses test-only event envelopes. Add `--codex` to check discovery in two isolated projects with the Codex executable on PATH. Add `--wait-decay` to test the full 30-second window.

## Publication commands, after explicit approval

The suggested target is `<confirmed-owner>/Codex-HaloFlux`. Confirm the GitHub account and owner, check for an existing repository using authorized access, and confirm a public display name plus the GitHub-provided noreply address. An anonymous 404 cannot establish that an authenticated owner has no private repository. If a repository exists, verify its ownership and contents before proceeding. The commands assume an audited `main` commit in a fresh checkout. Confirm its author and committer metadata, and configure repository-local identity if a new commit is needed. [GitHub commit email settings](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)

```powershell
gh auth status
gh repo view '<confirmed-owner>/Codex-HaloFlux'
git log -1 --format=fuller
git status --short
```

After the ownership, privacy and inventory checks, run the following steps in order. Stop and investigate if any step fails.

```powershell
gh repo create '<confirmed-owner>/Codex-HaloFlux' --public --source=. --remote=origin
git push -u origin main
git tag v1.0.0
git push origin refs/tags/v1.0.0
git archive --format=zip --prefix=Codex-HaloFlux/ --output=../Codex-HaloFlux-v1.0.0-windows.zip v1.0.0
$zip = '../Codex-HaloFlux-v1.0.0-windows.zip'
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  Codex-HaloFlux-v1.0.0-windows.zip" | Set-Content -LiteralPath "$zip.sha256" -Encoding ascii
gh release create v1.0.0 $zip "$zip.sha256" --verify-tag --draft --title 'Codex-HaloFlux v1.0.0' --notes-file docs/RELEASE_NOTES_v1.0.0.md
```

Compare the actual tag tree and ZIP inventory with the allowlist before uploading the assets. Apply the approved description and topics from [publication copy](PUBLICITY.md). In the draft Release body, remove the draft label and resolve document links to the tagged GitHub URLs. After draft review, publish with `gh release edit v1.0.0 --draft=false`, and verify the public repo, release, downloaded ZIP/checksum and attribution. [Create a repository](https://cli.github.com/manual/gh_repo_create) · [Create a release](https://cli.github.com/manual/gh_release_create)
