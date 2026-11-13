import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import { hookKey, minimizeHook, signHook } from './hook-protocol.mjs';

const at = Date.now();
const port = Number(process.argv[2] ?? 49373);
const maxInput = 1024 * 1024;
process.stdout.on('error', () => {});
process.stdout.write('{}\n');

async function forward() {
  if (process.platform !== 'win32' || !Number.isInteger(port) || port < 1024 || port > 65535) return;
  const input = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    if (length > maxInput) return;
    input.push(chunk);
  }
  const raw = JSON.parse(Buffer.concat(input).toString('utf8'));
  const key = await hookKey();
  const event = minimizeHook(raw, key, at);
  if (!event) return;
  const body = JSON.stringify(event);
  const delivery = randomUUID();
  await new Promise(resolveRequest => {
    const req = request({
      hostname: '127.0.0.1', port, path: '/ingest', method: 'POST',
      // Use a direct connection even when Node's global agent inherits proxy settings.
      agent: false,
      signal: AbortSignal.timeout(230),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-HaloFlux-Delivery': delivery,
        'X-HaloFlux-Signature': signHook(key, delivery, body),
      },
    }, response => {
      response.resume();
      response.once('end', resolveRequest);
      response.once('error', resolveRequest);
    });
    req.once('error', resolveRequest);
    req.end(body);
  });
}

const deadline = setTimeout(() => process.stdin.destroy(), 500);
deadline.unref();
try { await forward(); }
catch { /* Advisory delivery failures leave the Codex operation alone. */ }
finally { clearTimeout(deadline); }
