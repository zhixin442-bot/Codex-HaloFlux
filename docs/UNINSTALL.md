# Stop, disable, uninstall and roll back

Run commands from the extracted source in PowerShell 7. Keep the same `CODEX_HOME` and Windows account used for installation.

- **Stop the wallpaper service.** Press Ctrl+C in the terminal running the bridge. Hooks exit silently when the bridge is offline. Events delivered while stopped are dropped. Select another wallpaper in Lively or remove the HaloFlux library entry separately.
- **Stop listening.** Run `.\Manage-Hooks.ps1 -Action Disable`. It removes only matching HaloFlux groups and preserves other definitions, including those added later. Open a new Codex chat to load the change. Run Install with `-Approve` to re-enable it. The private runtime and backups remain available.
- **Keep ambient animation.** After disabling Hooks, stop the event bridge, run `node .\server.mjs` from the source folder and switch Lively to `http://127.0.0.1:49371/wallpaper`. Ambient mode works independently of the installed Hook runtime.
- **Uninstall.** Stop the bridge, then run `.\Manage-Hooks.ps1 -Action Uninstall`. This disables the Hooks and removes installed files it can verify. Repeat runs are safe. If an owned definition or installed file was edited, the script reports the conflict for manual review. Remove only the reviewed HaloFlux entries before retrying.
- **Remove retained private files.** After uninstalling and closing the bridge terminal, inspect `%LOCALAPPDATA%\Codex-HaloFlux-Community`. Delete the timestamped `backups` you no longer need and the empty `manage.lock` and `bridge.lock` files. Remove the directory when empty. Delete the extracted package folder whenever you no longer need the scripts. The installer leaves Codex’s own trust records to Codex. Use its Hooks UI to revoke trust before uninstall if your version offers that action.

## Roll back a failed or unwanted merge

The installer prints a private snapshot path on each configuration change. The first install snapshot contains the prior `hooks.json`, or `hooks-was-absent.txt` if no file existed. Existing `config.toml` is copied for reference and remains unchanged by this tool. The preferred rollback is Disable or Uninstall because these preserve subsequent user edits.

If a manual rollback is needed, first preserve the current `hooks.json`. Compare it with the selected backup in a local editor. Restore the full backup only after confirming no later edits would be lost. When the file was initially absent, remove the generated file only if it still contains solely HaloFlux data. If the script reports a concurrent edit, compare the current file with any retained `.previous` or `.rejected` conflict copies before retrying. Keep backups local because they can contain other Hook commands or private configuration.

An interrupted install before its manifest is written can leave private staging files. Inspect the private runtime and remove its confirmed partial HaloFlux files before reinstalling. No changes to Hook registrations are attempted before the manifest exists.

To upgrade the package or its private Node.js runtime, uninstall the current copy, then run Plan and Install from the new package. Review the updated definitions in Codex.
