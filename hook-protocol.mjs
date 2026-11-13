import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const hookEvents = [
  'UserPromptSubmit', 'PreModelRequest', 'PostModelRequest', 'PreToolUse',
  'PostToolUse', 'PermissionRequest', 'Stop', 'Interrupt',
];
const hexKey = /^[a-f0-9]{64}$/;
const deliveryId = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const idPattern = /^[a-f0-9]{16}$/;
const outcomes = ['completed', 'failed', 'cancelled'];
const fields = ['v', 'type', 'at', 'session', 'turn', 'call', 'actor', 'outcome'];

export async function hookKey() {
  const key = (await readFile(new URL('./event.key', import.meta.url), 'utf8')).trim();
  if (!hexKey.test(key)) throw new Error('Invalid local hook key');
  return key;
}

export function authorized(header, key) {
  return typeof header === 'string' && hexKey.test(header) &&
    timingSafeEqual(Buffer.from(header, 'hex'), Buffer.from(key, 'hex'));
}

export function signHook(key, delivery, body) {
  return createHmac('sha256', Buffer.from(key, 'hex'))
    .update('codex-haloflux/ingest/v1\0').update(delivery).update('\0').update(body).digest('hex');
}

export function signedHookHeaders(delivery, signature) {
  return typeof delivery === 'string' && deliveryId.test(delivery) &&
    typeof signature === 'string' && hexKey.test(signature);
}

export function minimizeHook(raw, key, at) {
  if (!raw || !hookEvents.includes(raw.hook_event_name)) return null;
  const alias = (namespace, value) => typeof value === 'string' && value.length > 0 && value.length <= 512
    ? createHmac('sha256', Buffer.from(key, 'hex')).update(namespace).update('\0').update(value).digest('hex').slice(0, 16)
    : undefined;
  const type = raw.hook_event_name;
  const session = alias('session', raw.session_id);
  const turn = alias('turn', raw.turn_id);
  if (!session || !turn) return null;
  const event = { v: 1, type, at, session, turn };
  if (type === 'PreToolUse' || type === 'PostToolUse') {
    const call = alias('call', raw.tool_use_id);
    if (call) event.call = call;
  }
  if (type === 'PreModelRequest' || type === 'PostModelRequest') {
    const actor = alias('actor', raw.agent_id);
    if (actor) event.actor = actor;
  }
  if (type === 'PostModelRequest' && outcomes.includes(raw.status)) event.outcome = raw.status;
  return event;
}

export function validEvent(event, now = Date.now()) {
  return event && typeof event === 'object' && !Array.isArray(event) &&
    Object.keys(event).every(field => fields.includes(field)) &&
    event.v === 1 && hookEvents.includes(event.type) &&
    Number.isSafeInteger(event.at) && Math.abs(event.at - now) <= 30_000 &&
    typeof event.session === 'string' && idPattern.test(event.session) &&
    typeof event.turn === 'string' && idPattern.test(event.turn) &&
    (event.call === undefined || (['PreToolUse', 'PostToolUse'].includes(event.type) &&
      typeof event.call === 'string' && idPattern.test(event.call))) &&
    (event.actor === undefined || (['PreModelRequest', 'PostModelRequest'].includes(event.type) &&
      typeof event.actor === 'string' && idPattern.test(event.actor))) &&
    (event.outcome === undefined || (event.type === 'PostModelRequest' && outcomes.includes(event.outcome)));
}
