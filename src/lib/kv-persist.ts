/**
 * Upstash Redis persistence adapter (zero dependencies).
 *
 * Mirrors the whole JSON store to a single Redis key via Upstash's REST API.
 * Works with whichever env vars your integration injected:
 *   - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (Upstash native)
 *   - KV_REST_API_URL          / KV_REST_API_TOKEN        (Vercel KV / Vercel
 *     Marketplace "Upstash Redis" integration)
 */
export function kvConfigured(): boolean {
  return !!(kvUrl() && kvToken());
}

export function kvUrl(): string {
  return (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/$/, '');
}

export function kvToken(): string {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
}

const KEY = 'leafsolar:data';

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${kvToken()}` };
}

export async function kvGet(): Promise<string | null> {
  if (!kvConfigured()) return null;
  const res = await fetch(`${kvUrl()}/get/${KEY}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Upstash get failed: ${res.status}`);
  const data = (await res.json()) as { result?: string | null };
  return data.result ?? null;
}

export async function kvPut(value: string): Promise<void> {
  if (!kvConfigured()) return;
  const res = await fetch(`${kvUrl()}/set/${KEY}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'text/plain' },
    body: value,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Upstash set failed: ${res.status}`);
}
