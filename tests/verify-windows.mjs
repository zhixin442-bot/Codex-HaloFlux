import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { lstat, mkdtemp, mkdir, readFile, realpath, rm, writeFile, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { hookEvents } from '../hook-protocol.mjs';
import { createLive } from '../live-events.mjs';

assert.equal(process.platform, 'win32');
const root = fileURLToPath(new URL('../', import.meta.url));
const temporaryParent = await realpath(tmpdir());
const work = await mkdtemp(join(temporaryParent, 'HaloFlux 空间 '));
const codexHome = join(work, 'codex');
const local = join(work, 'local');
const runtime = join(local, 'Codex-HaloFlux-Community');
const hooksFile = join(codexHome, 'hooks.json');
const configFile = join(codexHome, 'config.toml');
const env = { ...process.env, CODEX_HOME: codexHome, LOCALAPPDATA: local, NODE_OPTIONS: '' };
const children = [];
const baseline = {
  description: 'Synthetic user preferences',
  hooks: { Stop: [{ hooks: [{ type: 'command', command: 'Write-Output existing-fixture', timeout: 5 }] }], PreToolUse: [] },
};
const config = '[features]\nplugins = false\n\n[hooks]\n';
await Promise.all([mkdir(codexHome), mkdir(local)]);
const readHooks = async () => JSON.parse(await readFile(hooksFile, 'utf8'));

function ps(commandArgs, { input, shouldFail = false, cwd = root, extraEnv } = {}) {
  const result = spawnSync('pwsh.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', ...commandArgs],
    { env: { ...env, ...extraEnv }, cwd, encoding: 'utf8', input, windowsHide: true, timeout: 20_000 });
  assert.ifError(result.error);
  if (shouldFail) assert.notEqual(result.status, 0);
  else assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const manage = (action, options = [], shouldFail = false) =>
  ps(['-File', join(root, 'Manage-Hooks.ps1'), '-Action', action, ...options], { shouldFail });

async function allocatePort() {
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

async function checkCodexDiscovery(projects) {
  const exe = ps(['-Command', '(Get-Command codex.exe -CommandType Application).Source']);
  assert.ok(exe, 'Codex executable is needed for --codex');
  const child = spawn(exe, ['app-server'], { env, cwd: projects[0], windowsHide: true });
  children.push(child);
  child.stderr.resume();
  const lines = createInterface({ input: child.stdout });
  let nextId = 0;
  const pending = new Map();
  lines.on('line', line => {
    const message = JSON.parse(line);
    pending.get(message.id)?.(message);
  });
  async function rpc(method, params) {
    const id = ++nextId;
    let timer;
    try {
      const message = await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`Codex RPC timed out: ${method}`)), 10_000);
        pending.set(id, resolve);
        child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
      });
      assert.equal(message.error, undefined, JSON.stringify(message.error));
      return message.result;
    } finally {
      clearTimeout(timer);
      pending.delete(id);
    }
  }
  await rpc('initialize', { clientInfo: { name: 'haloflux-release-test', version: '1' }, capabilities: { experimentalApi: true } });
  child.stdin.write('{"method":"initialized"}\n');
  const { data } = await rpc('hooks/list', { cwds: projects });
  assert.equal(data.length, projects.length);
  for (const project of data) {
    assert.equal(project.errors.length, 0);
    const hooks = project.hooks.filter(hook => hook.command?.includes('forward-hook.mjs'));
    assert.equal(hooks.length, 8);
    assert.ok(hooks.every(hook => hook.async && hook.timeoutSec === 1 && hook.trustStatus === 'untrusted'));
  }
  child.stdin.end();
  await stop(child);
  console.log('Codex discovery: 8 asynchronous, untrusted user Hooks in each of two isolated projects');
}

async function start(executable, script, port, live) {
  const child = spawn(executable, [script, ...(live ? ['--live'] : [])], {
    env: { ...env, HALOFLUX_PORT: String(port) }, windowsHide: true,
  });
  children.push(child);
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  const base = `http://127.0.0.1:${port}`;
  for (let attempts = 0; attempts < 60; attempts++) {
    if (child.exitCode !== null) throw new Error(errors);
    try {
      if ((await fetch(`${base}/wallpaper`, { signal: AbortSignal.timeout(400) })).ok) return { base, child };
    } catch { /* Wait for the owned test process. */ }
    await delay(50);
  }
  throw new Error('Bridge did not start: ' + errors);
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exit = new Promise(resolve => child.once('exit', resolve));
  child.kill();
  await exit;
}

async function snapshot(base) {
  const response = await fetch(`${base}/events`, { signal: AbortSignal.timeout(3000) });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let chunk = '';
  try {
    while (!chunk.includes('\n\n')) {
      const result = await reader.read();
      if (result.done) break;
      chunk += decoder.decode(result.value, { stream: true });
    }
    const data = chunk.split('\n').find(line => line.startsWith('data: '));
    assert.ok(data);
    return JSON.parse(data.slice(6));
  } finally { await reader.cancel(); }
}

async function verifyPage(base, source) {
  const page = await fetch(`${base}/wallpaper`);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.match(page.headers.get('content-security-policy'), /media-src 'none'/);
  const body = await page.text();
  assert.match(body, /<canvas id="stage"/);
  assert.match(body, /Both public modes are silent/);
  assert.doesNotMatch(body, /<audio\s+id=/);
  assert.ok(body.includes(`data-activity-source="${source}"`));
  assert.doesNotMatch(body, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.equal((await fetch(`${base}/audio/sw421k.mp3`)).status, 404);
}

try {
  const abandonedTurn = createLive('codex-hooks', () => {});
  const at = Date.now();
  abandonedTurn.receive({ type: 'UserPromptSubmit', session: 'fixture-exit', turn: 'abandoned-turn', at });
  assert.equal(abandonedTurn.snapshot(at + 15 * 60_000 - 1).sessions.length, 1);
  assert.equal(abandonedTurn.snapshot(at + 15 * 60_000).sessions.length, 0);
  console.log('Abandoned turn expires after 15 minutes without a terminal event');

  const ambient = await start(process.execPath, join(root, 'server.mjs'), await allocatePort(), false);
  await verifyPage(ambient.base, 'ambient');
  assert.deepEqual((await snapshot(ambient.base)).sessions, []);
  assert.equal((await fetch(`${ambient.base}/ingest`, { method: 'POST', body: '{}' })).status, 405);
  await stop(ambient.child);
  console.log('Ambient: Canvas source, SSE, no ingest, strict silence, no remote fonts');

  const port = await allocatePort();
  const portArgs = ['-Port', String(port)];
  await writeFile(hooksFile, JSON.stringify(baseline));
  await writeFile(configFile, config);
  const plan = manage('Plan', portArgs);
  assert.match(plan, /Add one group/);
  await assert.rejects(stat(runtime), { code: 'ENOENT' });
  manage('Install', portArgs, true);
  assert.deepEqual(await readHooks(), baseline);
  manage('Install', ['-Approve', ...portArgs]);
  assert.match(manage('Install', ['-Approve', ...portArgs]), /already installed/);
  const installed = await readHooks();
  assert.equal(installed.hooks.Stop.length, 2);
  assert.deepEqual(installed.hooks.Stop[0], baseline.hooks.Stop[0]);
  assert.equal(await readFile(configFile, 'utf8'), config);
  const alpha = join(work, 'project-alpha');
  const beta = join(work, 'project-beta');
  await Promise.all([mkdir(alpha), mkdir(beta)]);
  if (process.argv.includes('--codex')) await checkCodexDiscovery([alpha, beta]);

  const marker = 'test-only payload content';
  const emit = (type, project = alpha, more = {}, extraEnv) => {
    const group = installed.hooks[type].at(-1);
    assert.equal(group.hooks[0].async, true);
    assert.equal(group.hooks[0].timeout, 1);
    const cmd = group.hooks[0].command;
    const input = JSON.stringify({
      hook_event_name: type, session_id: project === alpha ? 'fixture-alpha' : 'fixture-beta', turn_id: 'fixture-turn',
      prompt: marker, cwd: project, tool_input: { command: marker }, tool_response: marker, ...more,
    });
    // Supply stdin to the generated command in PowerShell as Codex does.
    const encoded = Buffer.from(cmd, 'utf16le').toString('base64');
    assert.equal(ps(['-EncodedCommand', encoded], { input, cwd: project, extraEnv }), '{}');
  };
  emit('UserPromptSubmit');
  console.log('Installed command exits neutrally with the bridge offline');

  const live = await start(join(runtime, 'node.exe'), join(runtime, 'server.mjs'), port, true);
  await verifyPage(live.base, 'codex-hooks');
  assert.deepEqual((await snapshot(live.base)).sessions, []);
  assert.equal((await fetch(`${live.base}/ingest`, { method: 'POST', body: '{}' })).status, 403);
  let proxyRequests = 0;
  const proxy = createHttpServer((request, response) => { proxyRequests++; response.writeHead(502).end(); });
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  try {
    emit('UserPromptSubmit', alpha, {}, {
      NODE_USE_ENV_PROXY: '1', HTTP_PROXY: `http://127.0.0.1:${proxy.address().port}`, NO_PROXY: '',
    });
    assert.equal((await snapshot(live.base)).last?.type, 'UserPromptSubmit');
    assert.equal(proxyRequests, 0);
  } finally {
    proxy.closeAllConnections();
    await new Promise(resolve => proxy.close(resolve));
  }
  console.log('Hook delivery remains direct with Node HTTP proxy enabled');
  emit('UserPromptSubmit', beta);
  emit('PreModelRequest');
  emit('PostModelRequest', alpha, { status: 'completed' });
  emit('PermissionRequest');
  emit('PreToolUse', alpha, { tool_use_id: 'fixture-call' });
  const active = await snapshot(live.base);
  assert.equal(active.sessions.length, 2);
  assert.equal(active.toolActivity.starts, 1);
  assert.ok(active.effects.some(effect => effect.kind === 'beam'));
  emit('PreToolUse', alpha, { tool_use_id: 'fixture-call' });
  emit('PostToolUse', alpha, { tool_use_id: 'fixture-call' });
  emit('Stop');
  const afterStop = await snapshot(live.base);
  assert.equal(afterStop.sessions.length, 1);
  assert.ok(afterStop.effects.some(effect => effect.kind === 'wave'));
  assert.equal(afterStop.toolActivity.starts, 1);
  emit('Interrupt', beta);
  const status = await (await fetch(`${live.base}/hook-status`)).text();
  const evidence = JSON.parse(status);
  assert.equal(evidence.sessions.length, 0);
  for (const event of hookEvents) assert.equal(evidence.counts[event], event === 'UserPromptSubmit' ? 2 : 1);
  assert.ok(!status.includes(marker) && !status.includes('fixture-alpha') && !status.includes('project-alpha'));
  console.log('Hook fixtures: 8 event types, 2 sessions, duplicate tool edge ignored, beam/wave, payload minimized');
  if (process.argv.includes('--wait-decay')) {
    await delay(31_000);
    assert.equal((await snapshot(live.base)).toolActivity.starts, 0);
    console.log('30-second tool window expired in the live SSE stream');
  }
  await stop(live.child);
  await assert.rejects(fetch(`${live.base}/wallpaper`, { signal: AbortSignal.timeout(500) }));
  emit('PreToolUse', alpha, { tool_use_id: 'offline-fixture-call' });
  const restarted = await start(join(runtime, 'node.exe'), join(runtime, 'server.mjs'), port, true);
  assert.equal((await snapshot(restarted.base)).sequence, 0);
  emit('UserPromptSubmit');
  assert.equal((await snapshot(restarted.base)).sessions.length, 1);
  await stop(restarted.child);
  console.log('Closed SSE client can reconnect; bridge restart drops old state and accepts new events');

  const added = { hooks: [{ type: 'command', command: 'Write-Output later-fixture' }] };
  installed.hooks.Stop.push(added);
  await writeFile(hooksFile, JSON.stringify(installed));
  manage('Disable');
  manage('Disable');
  const expected = structuredClone(baseline);
  expected.hooks.Stop.push(added);
  assert.deepEqual(await readHooks(), expected);
  const wallpaperOnly = await start(process.execPath, join(root, 'server.mjs'), await allocatePort(), false);
  await verifyPage(wallpaperOnly.base, 'ambient');
  assert.equal((await snapshot(wallpaperOnly.base)).sequence, 0);
  await stop(wallpaperOnly.child);
  manage('Install', ['-Approve', ...portArgs]);
  manage('Uninstall');
  manage('Uninstall');
  assert.deepEqual(await readHooks(), expected);
  assert.equal(await readFile(configFile, 'utf8'), config);
  await assert.rejects(stat(join(runtime, 'node.exe')), { code: 'ENOENT' });

  await rm(hooksFile);
  manage('Install', ['-Approve', ...portArgs]);
  manage('Uninstall');
  await assert.rejects(stat(hooksFile), { code: 'ENOENT' });
  await writeFile(hooksFile, '{"hooks":{"Stop":[],"Stop":[]}}');
  manage('Install', ['-Approve', ...portArgs], true);
  assert.equal(await readFile(hooksFile, 'utf8'), '{"hooks":{"Stop":[],"Stop":[]}}');
  console.log('Installer: Plan read-only, approval required, merge, repeated disable/uninstall, absent-file restore, malformed JSON refused');
} finally {
  await Promise.all(children.map(stop));
  const target = await realpath(work);
  assert.equal(target.toLowerCase(), work.toLowerCase());
  assert.equal(dirname(target).toLowerCase(), temporaryParent.toLowerCase());
  assert.ok(basename(target).startsWith('HaloFlux 空间 ') && !(await lstat(work)).isSymbolicLink());
  await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}
