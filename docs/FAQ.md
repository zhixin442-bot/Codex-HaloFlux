# Frequently asked questions

## Can I use the wallpaper without Codex?

Yes. Run `node .\server.mjs` and add `http://127.0.0.1:49371/wallpaper` to Lively. To turn off an existing integration, run `.\Manage-Hooks.ps1 -Action Disable` and open a fresh Codex chat. For the original ambient animation, start ambient mode and switch Lively to its URL. [Stop and uninstall](UNINSTALL.md)

## Why does the live wallpaper look idle?

Check that the bridge terminal is open and the page uses the printed URL. Visit `/hook-status` on that same loopback address. Check that the eight definitions are trusted in the desktop Hooks settings, then start a fresh local chat and run a supported read-only tool. Older Codex versions or managed settings can affect tool coverage. The original data panels are decorative. [Installation and testing](INSTALL.md) · [Codex Hooks](https://learn.chatgpt.com/docs/hooks)

## What happens if I quit Codex, close the wallpaper, or stop the bridge?

Closing Lively or the page closes its SSE connection. The bridge can continue receiving minimized events and supplies its current snapshot when a viewer returns. If Codex exits during a turn without a terminal event, that turn expires after 15 minutes. Recent tool starts leave the activity window after 30 seconds. Stopping the bridge drops incoming events. An already loaded page continues its Canvas loop and attempts to reconnect. A bridge restart begins with empty in-memory state.

## Will the installer replace my existing Hooks?

It adds one HaloFlux group for each supported event in the selected user-scope `hooks.json`. It takes a private backup and preserves other groups and `config.toml`. If a previous HaloFlux installation or an edited owned rule is detected, review it using the uninstall guide before retrying. Finish other configuration edits before running the installer. [Uninstall and rollback](UNINSTALL.md)

## Does it support Windows 10?

Windows 10 is a target platform with an outstanding real-system smoke test. See the release notes for the verified Windows 11 configuration and remaining checks. [Release notes](RELEASE_NOTES_v1.0.0.md)

## Can I publish a screenshot or a derivative?

Use the terms in the upstream license. Include the original attribution and link in the visible listing or description, and identify your work as modified from HALOFLUX. Use a clean demo profile when recording. [License](../LICENSE) · [Media placeholders](media/README.md)
