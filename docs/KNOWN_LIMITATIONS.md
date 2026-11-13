# Known limitations

- **Windows and player scope.** Windows 11 was tested. Windows 10 and other native Codex versions remain unverified beyond the recorded environment. The installer targets Windows. Desktop testing used Lively WebView2, including renderer output and reconnect. Lively switch-away and app-exit scenarios have partial coverage.
- **Event coverage.** The bridge observes selected Codex Hooks. The verified native path used a read-only local MCP tool. A full tool timeline, tool contents, machine-wide Codex idle and hidden model reasoning are unavailable. A model glow reflects observed request activity.
- **Best-effort state.** Asynchronous edges can arrive out of order, and some events can be dropped or absent. Tool-rate deduplication depends on call IDs. After an abrupt exit without a terminal event, a turn can persist until the 15-minute expiry. Stopping the bridge discards its in-memory activity, and offline events are lost.
- **Overhead.** Each matching Hook starts a short process. The configured timeout bounds Hook work. The original Canvas can be expensive at 4K, high device pixel ratios or high refresh rates. See the [performance guide](PERFORMANCE_TUNING.md) for ways to measure and tune it.
- **Local visibility.** Other local applications that can reach the bridge can read the minimized SSE and status data. Managed Codex policies may limit Hook availability. Ambient mode is available independently.

[Tested environment and evidence](FINAL_ACCEPTANCE.md) · [Security](../SECURITY.md)
