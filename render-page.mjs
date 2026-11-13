// Adapt the pinned desktop lab in memory. The upstream working copy stays byte-for-byte intact.
export function renderPage(upstream, wallpaper, source) {
  let page = upstream;
  function replaceOnce(original, replacement) {
    if (page.split(original).length !== 2) throw new Error('HaloFlux source does not match the pinned adapter');
    page = page.replace(original, () => replacement);
  }

  replaceOnce('<title>Paper Lab Console</title>', '<title>Codex-HaloFlux</title>');
  replaceOnce('<link rel="preconnect" href="https://fonts.googleapis.com">', '');
  replaceOnce('<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&display=swap" rel="stylesheet">', '<link rel="stylesheet" href="/activity.css">');
  replaceOnce('<body>', `<body class="${wallpaper ? 'wallpaper' : ''}" data-activity-source="${source}">`);
  replaceOnce('RESEARCH PAPERS → REPRODUCIBLE EXPERIMENTS', 'CODEX-HALOFLUX / ORIGINAL HALOFLUX DEMO PANELS');
  replaceOnce('<canvas id="stage"></canvas>', `<canvas id="stage" aria-label="HaloFlux 光场"></canvas>
    <aside id="activity" aria-label="Codex-HaloFlux">
      <div class="activity-source">${source === 'ambient' ? 'AMBIENT' : 'CODEX HOOKS / LOCAL'}</div>
      <div id="activity-state" role="status">正在连接本地桥接器</div>
      <div id="activity-event">等待事件</div>
    </aside>`);
  replaceOnce('<script>\nconst TAU', '<script src="/activity.js"></script>\n<script>\nconst TAU');
  replaceOnce('  updateBeat(dt); updateCam(dt); updateOuter(dt);',
    '  const activity = window.haloFluxActivity.update(dt);\n  updateBeat(dt); updateCam(dt); updateOuter(dt);');
  replaceOnce('  updateRing(dt);', '  updateRing(dt * activity.ringRate);');
  replaceOnce('r.t += dt * C.runnerSpeed *', 'r.t += dt * C.runnerSpeed * activity.runnerRate *');
  replaceOnce('C.webPulseAmp * layerEnv[k]', 'C.webPulseAmp * (layerEnv[k] + 0.48 * activity.model)');
  replaceOnce('  drawRing(dt);', '  drawRing(dt);\n  window.haloFluxActivity.draw(S, { cx, cy, R, RO, RMAX, thS, glow: C.glow });');
  replaceOnce('<div class="ov music" id="bgm">', '<div class="ov music" id="bgm" hidden style="display:none">');
  replaceOnce('<audio id="bgmAudio" data-src="audio/sw421k.mp3" loop preload="auto" playsinline></audio>', '');
  replaceOnce('(function initBGM() {', '(function initBGM() {\n  return; // Both public modes are silent.');
  return page;
}
