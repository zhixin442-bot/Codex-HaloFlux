# Performance tuning and development

The v1.0 renderer uses the original Canvas pipeline. Tune it on your monitor using the upstream console and a local development copy.

## Canvas resolution and 4K

In [the pinned renderer](../upstream/haloflux/lab.html), `DPR` is capped at 2 at initialization and again in `resizeAll()`. `resizeStage()` sets the main Canvas backing size to `W * DPR` by `H * DPR`; layout and geometry use CSS pixels. A 3840 × 2160 backing surface has four times the pixels of 1920 × 1080, before accounting for the original layer buffers and blending. Lively playback rules, monitor scale and GPU acceleration affect the result.

Inspect the running page in DevTools:

```js
const c = document.querySelector('#stage');
({
  css: [c.clientWidth, c.clientHeight],
  backing: [c.width, c.height],
  devicePixelRatio: window.devicePixelRatio
});
```

To compare a lower render resolution in a development copy, change the cap from 2 to 1 in both DPR assignments. Restart the ambient server and reload at the same window size. Expect softer rendering on high-density displays. This edit is separate from system scaling and the SSE connection.

## Frame rate, particles and lighting

- **Frame rate.** The upstream `frame(now)` schedules itself with `requestAnimationFrame`. There is no FPS control in v1.0. For a local 30 FPS experiment, insert `if (now - last < 1000 / 30 - 0.5) { requestAnimationFrame(frame); return; }` at the start of `frame(now)`. Keep the existing `dt` and `last = now` below that guard so skipped frames do not advance time. Compare the resulting cadence and motion. This sample is a source-edit experiment, outside the shipped behavior.
- **Particles.** Open the original console with C at `/`. Try lowering `runnerCount` (individual lines inside the ring), `flyerCount` (outbound streaks), and `hazeCount` (broad light bands). To change defaults in a fork, edit the corresponding values in `BAKED_MINE`. Saved console settings in the web player can override source defaults, and Lively has separate browser storage.
- **Lighting.** `glow` adjusts the global glow. `webBlur` softens the interior web and `depthBlur` softens the distant outer layer. The active preset sets both blur values to zero. `beamBright`, `beamGlow`, `beamWidth` and `beamLen` change the original beams. Measure each change. Lower brightness or blur strength does not necessarily reduce draw calls.

## Verify a change

1. Capture a baseline in the same WebView2 or browser player, at the same resolution, refresh rate, display scale and wallpaper playback setting. Let it warm up and use the same measurement interval for each run.
2. Use DevTools Performance to compare frame times, dropped frames and raster/composite work. In Task Manager compare the Lively/WebView2 process group’s CPU, GPU and memory. Include the bridge’s Node process separately and record both idle and active intervals.
3. After editing the renderer, start ambient mode to check layout, animation and console. In a separate local event test, check that `/events` reconnects, two sessions stay independent, a tool beam and a completion wave appear, and the 30-second `toolActivity` window clears. Watch the console for adapter errors.
4. Keep the integration anchors in [render-page.mjs](../render-page.mjs) intact, including the `activity.update(dt)` and `activity.draw(...)` calls. The adapter checks for the original source fragments at startup. Tune Canvas work without changing Hook configuration, the SSE schema, event timing or deduplication. Test changes on a development copy before reinstalling a trusted runtime.
