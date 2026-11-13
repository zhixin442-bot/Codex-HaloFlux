import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createLive } from './live-events.mjs';
import { authorized, hookKey, signedHookHeaders, signHook, validEvent } from './hook-protocol.mjs';
import { renderPage } from './render-page.mjs';

const live = process.argv.includes('--live');
const source = live ? 'codex-hooks' : 'ambient';
const port = Number(process.env.HALOFLUX_PORT ?? (live ? 49373 : 49371));
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid HALOFLUX_PORT');
const host = '127.0.0.1';
const origin = `http://${host}:${port}`;
const read = path => readFile(new URL(path, import.meta.url));
const lab = (await read('upstream/haloflux/lab.html')).toString('utf8');
const html = 'text/html; charset=utf-8';
const assets = new Map([
  ['/', [html, renderPage(lab, false, source)]],
  ['/wallpaper', [html, renderPage(lab, true, source)]],
  ['/activity.js', ['text/javascript; charset=utf-8', await read('activity.js')]],
  ['/activity.css', ['text/css; charset=utf-8', await read('activity.css')]],
  ['/LICENSE', ['text/plain; charset=utf-8', await read('LICENSE')]],
]);

const clients = new Set();
const packet = state => `id: ${state.sequence}\nevent: snapshot\ndata: ${JSON.stringify(state)}\n\n`;
function send(response, chunk) {
  if (!response.write(chunk)) response.destroy();
}
const state = createLive(source, snapshot => {
  const chunk = packet(snapshot);
  for (const client of clients) send(client, chunk);
});
const key = live ? await hookKey() : null;
const deliveries = new Map();
const heartbeat = setInterval(() => {
  const chunk = packet(state.snapshot());
  for (const client of clients) send(client, chunk);
}, 3000);
heartbeat.unref();

async function ingest(request, response) {
  const length = Number(request.headers['content-length']);
  const delivery = request.headers['x-haloflux-delivery'];
  const signature = request.headers['x-haloflux-signature'];
  if (request.headers.origin || request.headers['sec-fetch-site'] || !signedHookHeaders(delivery, signature)) {
    response.writeHead(403).end();
    return;
  }
  if (request.headers['content-type'] !== 'application/json' || !Number.isInteger(length) || length < 1 || length > 768) {
    response.writeHead(400).end();
    return;
  }
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (!authorized(signature, signHook(key, delivery, body))) {
      response.writeHead(403).end();
      return;
    }
    const event = JSON.parse(body.toString('utf8'));
    const now = Date.now();
    if (!validEvent(event, now)) {
      response.writeHead(400).end();
      return;
    }
    for (const [id, at] of deliveries) {
      if (now - at < 60_000) break;
      deliveries.delete(id);
    }
    if (!deliveries.has(delivery)) {
      deliveries.set(delivery, now);
      if (deliveries.size > 4096) deliveries.delete(deliveries.keys().next().value);
      state.receive(event);
    }
    response.writeHead(204).end();
  } catch {
    if (!response.headersSent) response.writeHead(400).end();
  }
}

const server = createServer({ headersTimeout: 3000, requestTimeout: 3000, connectionsCheckingInterval: 1000 }, (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; media-src 'none'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  if (request.headers.host !== `${host}:${port}` || (request.headers.origin && request.headers.origin !== origin)) {
    response.writeHead(403).end();
    return;
  }
  const path = request.url.split('?')[0];
  if (request.method === 'POST' && path === '/ingest' && live) {
    void ingest(request, response);
    return;
  }
  if (request.method !== 'GET') {
    response.writeHead(405).end();
    return;
  }
  if (path === '/hook-status' && live) {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(state.evidence()));
    return;
  }
  if (path === '/events') {
    if (clients.size >= 24) {
      response.writeHead(503).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
    clients.add(response);
    response.on('close', () => clients.delete(response));
    send(response, `retry: 1200\n${packet(state.snapshot())}`);
    return;
  }
  if (!assets.has(path)) {
    response.writeHead(404).end();
    return;
  }
  const [type, body] = assets.get(path);
  response.writeHead(200, { 'Content-Type': type }).end(body);
});

server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Codex-HaloFlux · ${source} · ${origin}/wallpaper`));
