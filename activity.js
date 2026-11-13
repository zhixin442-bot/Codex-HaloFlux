(() => {
  let snapshot = null;
  let connected = false;
  let clock = 0;
  let model = 0;
  let ringRate = 0.18;
  let runnerRate = 1;
  const source = document.body.dataset.activitySource;
  const approvalLevels = new Map();
  function sector(id) {
    return (Number.parseInt(id.slice(0, 4), 16) / 65535 - 0.5) * 1.2;
  }
  const smooth = (from, to, dt) => from + (to - from) * (1 - Math.exp(-dt / (to > from ? 0.32 : 0.9)));

  function update(dt) {
    if (source === 'ambient') return { model: 0, ringRate: 1, runnerRate: 1 };
    clock += dt;
    const sessions = connected ? snapshot?.sessions ?? [] : [];
    const active = sessions.some(session => session.turn);
    const toolLevel = active ? snapshot?.toolActivity?.level ?? 0 : 0;
    model = smooth(model, Number(sessions.some(session => session.model)), dt);
    ringRate = smooth(ringRate, active ? 0.86 + 0.26 * toolLevel : 0.18, dt);
    runnerRate = smooth(runnerRate, 1 + 0.35 * toolLevel, dt);
    const waiting = new Set(sessions.filter(session => session.waiting).map(session => session.id));
    for (const id of waiting) if (!approvalLevels.has(id)) approvalLevels.set(id, 0);
    for (const [id, level] of approvalLevels) {
      const next = smooth(level, Number(waiting.has(id)), dt);
      if (next < 0.008 && !waiting.has(id)) approvalLevels.delete(id);
      else approvalLevels.set(id, next);
    }
    return { model, ringRate, runnerRate };
  }

  function arc(ctx, radius, angle, halfWidth, color, width) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.arc(0, 0, radius, angle - halfWidth, angle + halfWidth);
    ctx.stroke();
  }

  function core(ctx, radius, strength) {
    if (strength < 0.005) return;
    const x = radius * 0.37;
    const gradient = ctx.createRadialGradient(x, 0, 0, x, 0, radius * 0.54);
    gradient.addColorStop(0, `rgba(194,182,250,${strength})`);
    gradient.addColorStop(0.42, `rgba(152,143,230,${strength * 0.34})`);
    gradient.addColorStop(1, 'rgba(100,94,220,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius * 0.54, -radius * 0.54, radius * 1.08, radius * 1.08);
  }

  function draw(ctx, { cx, cy, R, RO, RMAX, thS, glow }) {
    const now = Date.now();
    const effects = snapshot?.effects ?? [];
    const gain = 0.66 + Math.min(glow, 1.5) * 0.3;
    const reach = Math.max(RO + 120, RMAX) - RO;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';
    core(ctx, R, model * gain * 0.26);

    for (const [id, level] of approvalLevels) {
      const direction = sector(id);
      if (level < 0.008) continue;
      const breathing = 0.72 + 0.28 * Math.sin(clock * 1.85);
      const a = level * breathing * gain;
      arc(ctx, (R + RO) / 2, direction * thS, 0.19, `rgba(246,161,52,${a * 0.2})`, (RO - R) * 0.74);
      arc(ctx, RO - 2, direction * thS, 0.22, `rgba(255,192,87,${a * 0.85})`, 2.5);
    }

    for (const effect of effects) {
      if (now < effect.at || now >= effect.until) continue;
      const p = (now - effect.at) / (effect.until - effect.at);
      const a = Math.sin(Math.PI * p) * gain;
      const direction = sector(effect.session) * thS;
      switch (effect.kind) {
        case 'pulse':
          core(ctx, R, a * 0.5);
          arc(ctx, R * (0.22 + 0.71 * p), direction * 0.3, 0.6, `rgba(219,208,255,${a * 0.42})`, 2.5);
          break;
        case 'beam': {
          const end = RO + reach * (0.15 + 0.85 * p);
          const gradient = ctx.createLinearGradient(Math.cos(direction) * RO, Math.sin(direction) * RO, Math.cos(direction) * end, Math.sin(direction) * end);
          gradient.addColorStop(0, `rgba(212,235,255,${a * 0.92})`);
          gradient.addColorStop(0.33, `rgba(175,185,246,${a * 0.59})`);
          gradient.addColorStop(1, 'rgba(169,179,255,0)');
          ctx.strokeStyle = gradient;
          for (let lane = -4; lane <= 4; lane++) {
            const angle = direction + lane * 0.009;
            ctx.lineWidth = lane === 0 ? 3 : 1;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * RO, Math.sin(angle) * RO);
            ctx.lineTo(Math.cos(angle) * end, Math.sin(angle) * end);
            ctx.stroke();
          }
          break;
        }
        case 'edit':
          arc(ctx, (R + RO) / 2, direction, 0.18, `rgba(102,230,194,${a * 0.23})`, (RO - R) * 0.7);
          arc(ctx, R + 2, direction, 0.21, `rgba(151,255,225,${a * 0.85})`, 2.6);
          arc(ctx, RO - 2, direction, 0.17, `rgba(151,255,225,${a * 0.7})`, 2);
          break;
        case 'fault':
          for (let fragment = -2; fragment <= 2; fragment++) {
            const alpha = a * (0.54 + 0.12 * Math.cos(p * 8 + fragment));
            arc(ctx, RO + 3 * Math.sin(fragment * 2), direction + fragment * 0.045, 0.016, `rgba(255,106,127,${alpha})`, 4);
          }
          arc(ctx, RO - 12, direction, 0.14, `rgba(255,83,113,${a * 0.18})`, 17);
          break;
        case 'wave': {
          const radius = RO + reach * p;
          arc(ctx, radius, 0, thS * 1.6, `rgba(188,211,255,${a * 0.2})`, 13);
          arc(ctx, radius + 9, 0, thS * 1.6, `rgba(222,229,255,${a * 0.64})`, 2);
          break;
        }
      }
    }
    ctx.restore();
  }

  window.haloFluxActivity = { update, draw };

  function statusText(state) {
    if (state.waiting) return state.model ? '待授权 · 模型请求中' : '待授权';
    if (state.model) return '模型请求中';
    if (state.tool) return '工具调用中';
    if (state.subagents) return `子代理 ${state.subagents}`;
    return state.turn ? '任务进行中' : '空闲';
  }

  function updateStatus() {
    const status = document.getElementById('activity-state');
    const event = document.getElementById('activity-event');
    const sessions = snapshot?.sessions ?? [];
    const last = snapshot?.last;
    const state = sessions.map(session => `${session.id.slice(0, 6)} ${statusText(session)}`).join(' ｜ ') || '空闲';
    status.textContent = connected
      ? (source === 'ambient' ? 'Ambient' : `推导状态 · ${state}`)
      : '本地桥接器已断开，正在重连';
    const label = source === 'codex-hooks' ? '收到 Hook · ' : '';
    event.textContent = connected && last ? `${label}${last.type} · ${last.session.slice(0, 6)}${last.outcome ? ` · ${last.outcome}` : ''}` : source === 'ambient' ? '' : '等待事件';
  }

  const stream = new EventSource('/events');
  stream.addEventListener('snapshot', message => {
    const next = JSON.parse(message.data);
    if (next.source !== source) return;
    snapshot = next;
    connected = true;
    updateStatus();
  });
  stream.onerror = () => {
    connected = false;
    updateStatus();
  };

})();
