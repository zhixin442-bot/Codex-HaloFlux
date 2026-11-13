const effectsMs = { pulse: 1500, beam: 1250, fault: 2300, wave: 2050 };
const permissionMs = 45_000;
const turnMs = 15 * 60_000;
const toolWindowMs = 30_000;
const toolsForFullActivity = 6;

export function createLive(source, publish) {
  const turns = new Map();
  const closed = new Map();
  const counts = {};
  const recent = [];
  const toolStarts = new Map();
  const toolEvents = new Map();
  let effects = [], sequence = 0;
  const toolLevel = () => Math.min(1, toolStarts.size / toolsForFullActivity);

  function snapshot(now = Date.now()) {
    effects = effects.filter(effect => effect.until > now);
    for (const [session, state] of turns) if (now - state.lastAt >= turnMs) turns.delete(session);
    for (const [key, at] of closed) if (now - at >= turnMs) closed.delete(key);
    for (const [key, at] of toolStarts) if (now - at >= toolWindowMs) toolStarts.delete(key);
    return {
      source, sequence, effects, last: recent.at(-1) ?? null,
      toolActivity: {
        windowMs: toolWindowMs,
        starts: toolStarts.size,
        level: toolLevel(),
      },
      sessions: [...turns].map(([id, state]) => ({
        id, turn: true, model: [...state.models.values()].some(count => count > 0),
        tool: [...state.tools.values()].some(call => call.active),
        waiting: state.permissionAt > 0 && now - state.permissionAt < permissionMs,
      })),
    };
  }

  function effect(kind, session, at, duration = effectsMs[kind]) {
    effects.push({ kind, session, at, until: at + duration });
    if (effects.length > 32) effects.shift();
  }

  function receive(event) {
    const { type, session, turn, at, call, actor, outcome } = event;
    const now = Date.now();
    const key = `${session}:${turn}`;
    if (call && (type === 'PreToolUse' || type === 'PostToolUse')) {
      for (const [old, seenAt] of toolEvents) {
        if (now - seenAt < turnMs) break;
        toolEvents.delete(old);
      }
      const edge = `${key}:${call}:${type}`;
      if (toolEvents.has(edge)) return;
      toolEvents.set(edge, now);
      if (toolEvents.size > 4096) toolEvents.delete(toolEvents.keys().next().value);
    }
    sequence += 1;
    counts[type] = (counts[type] ?? 0) + 1;
    const entry = { type, session, at };
    if (outcome) entry.outcome = outcome;
    recent.push(entry);
    if (recent.length > 32) recent.shift();
    snapshot(now);

    let state = turns.get(session);
    if (type === 'Stop' || type === 'Interrupt') {
      if (!closed.has(key) && type === 'Stop' && (!state || state.turn === turn)) effect('wave', session, now);
      closed.set(key, now);
      if (closed.size > 256) closed.delete(closed.keys().next().value);
      if (state?.turn === turn) turns.delete(session);
    } else if (!closed.has(key)) {
      if (!state || (state.turn !== turn && type === 'UserPromptSubmit' && at >= state.lastAt)) {
        if (!state && turns.size >= 32) turns.delete(turns.keys().next().value);
        state = { turn, lastAt: at, models: new Map(), tools: new Map(), permissionAt: 0, toolFinishedAt: 0, prompted: false };
        turns.set(session, state);
      }
      if (state.turn === turn) {
        state.lastAt = Math.max(state.lastAt, at);
        switch (type) {
          case 'UserPromptSubmit':
            if (!state.prompted) effect('pulse', session, now);
            state.prompted = true;
            break;
          case 'PreModelRequest':
          case 'PostModelRequest': {
            const model = actor ?? 'main';
            const delta = type === 'PreModelRequest' ? 1 : -1;
            state.models.set(model, (state.models.get(model) ?? 0) + delta);
            if (outcome === 'failed') effect('fault', session, now);
            break;
          }
          case 'PreToolUse': {
            const previous = state.tools.get(call);
            const toolKey = `${key}:${call}`;
            if (!previous?.started && !toolStarts.has(toolKey)) {
              // A call ID is required for the rate so retries of one event cannot inflate it.
              if (call) {
                toolStarts.set(toolKey, now);
                if (toolStarts.size > 256) toolStarts.delete(toolStarts.keys().next().value);
              }
              const speed = 1 + 0.35 * toolLevel();
              effect('beam', session, now, Math.round(effectsMs.beam / speed));
            }
            if (call) state.tools.set(call, { started: true, active: previous?.active ?? true });
            break;
          }
          case 'PostToolUse':
            if (call) state.tools.set(call, { started: state.tools.get(call)?.started ?? false, active: false });
            state.toolFinishedAt = Math.max(state.toolFinishedAt, at);
            if (at >= state.permissionAt) state.permissionAt = 0;
            break;
          case 'PermissionRequest':
            if (at > state.toolFinishedAt) state.permissionAt = Math.max(at, state.permissionAt);
            break;
        }
        if (state.tools.size > 128) state.tools.delete(state.tools.keys().next().value);
        if (state.models.size > 32) state.models.delete(state.models.keys().next().value);
      }
    }
    publish(snapshot(now));
  }

  return { receive, snapshot, evidence: () => ({ ...snapshot(), counts, recent }) };
}
