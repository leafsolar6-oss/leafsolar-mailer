/**
 * Vercel KV persistence adapter (zero dependencies).
 *
 * On Vercel serverless, the filesystem is read-only except /tmp, which is
 * ephemeral — so the JSON store alone would lose data between cold starts.
 * When Vercel KV is attached, the whole store is mirrored to a single KV
 * key (leafsolar:data) via Upstash's REST API:
 *   - hydrate(): pull the latest snapshot into memory on cold start
 *   - flush():   push after writes (debounced in store.ts)
 *
 * Everything degrades gracefully: if KV env vars are missing or the call
 * fails, the app keeps working with the in-memory/file store (local dev,
 * VPS, or Vercel without KV attached).
 */
export function kvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

const KEY = 'leafsolar:data';

function baseUrl(): string {
  return (process.env.KV_REST_API_URL || '').replace(/\/$/, '');
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN || ''}` };
}

export async function kvGet(): Promise<string | null> {
  if (!kvConfigured()) return null;
  const res = await fetch(`${baseUrl()}/get/${KEY}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`KV get failed: ${res.status}`);
  const data = (await res.json()) as { result?: string | null };
  return data.result ?? null;
}

export async function kvPut(value: string): Promise<void> {
  if (!kvConfigured()) return;
  const res = await fetch(`${baseUrl()}/set/${KEY}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'text/plain' },
    body: value,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`KV set failed: ${res.status}`);
}
