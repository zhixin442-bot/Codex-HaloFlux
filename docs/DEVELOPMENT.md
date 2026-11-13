# Develop and test locally

Use Windows 11, the official Windows Node.js distribution and PowerShell 7.4+. Codex is needed for the optional discovery check. There is no npm install or build step.

1. Run `node .\server.mjs` from the source folder. Visit `http://127.0.0.1:49371/` for the console or `/wallpaper` for the wallpaper. Press Ctrl+C to stop the process.
2. Run `node .\tests\verify-windows.mjs --wait-decay`. This creates and removes its own temporary Codex home and runtime, uses isolated loopback ports and sends explicit synthetic events. Add `--codex` for read-only discovery in two test projects. Inspect the test output for install, duplicate tool events, restart and rollback.
3. To validate against a native Codex tool, use a dedicated Windows profile or isolated Codex home, review `-Action Plan`, install only after approval and trust the new commands in that profile. Start the bridge from a separate terminal. Compare the wallpaper with `/hook-status` and the browser SSE stream. Keep private event data out of fixtures and issues.
4. Close the test viewer and reopen it. Stop the test bridge and repeat a benign tool call, then restart it and verify the fresh snapshot. Disable the project Hooks and uninstall the isolated runtime when finished.

## Change behavior

- **New Codex event.** Verify the installed client's Hook contract and async behavior. Add the event to the installer list and `hookEvents`, then update `minimizeHook()` and `validEvent()` only if new minimized fields are necessary. Add a state transition in `live-events.mjs`. Test reordered or missing edges, duplicate deliveries, two sessions and expiry.
- **New visual effect.** Add a small derived effect in `live-events.mjs` and a corresponding drawing branch in `activity.js`. Tune easing separately from observed timing. Retain the Canvas adapter insertion points and upstream credit.
- **Adjust the original visual.** Use the console for a baseline. Compare DPR, frame time, particle count and glow at the same resolution and refresh rate. Retest event-driven effects after changing the render loop. [Performance tuning](PERFORMANCE_TUNING.md)
- **Other agents, as a future extension.** Prototype a separate opt-in event producer. Translate only supported lifecycle metadata into a documented event contract, keep provider/session identity distinct, and audit the provider's permissions and license. The current runtime ships no other provider adapter.

[Architecture](ARCHITECTURE.md) · [Contributing](../CONTRIBUTING.md)
