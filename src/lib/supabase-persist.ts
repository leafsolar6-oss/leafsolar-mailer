/**
 * Supabase persistence adapter (zero dependencies).
 *
 * Vercel KV no longer exists (shut down Dec 2024; the replacement is only
 * available via the Vercel Marketplace "Upstash Redis" integration, which not
 * all accounts can see). As a marketplace-free alternative, the app can
 * mirror its whole JSON store to a single row in a free Supabase Postgres
 * table using Supabase's REST API (PostgREST) — no npm packages needed.
 *
 * Setup (see README → "Deploying to Vercel"):
 *   1. Create a free project at https://supabase.com
 *   2. In SQL Editor run:
 *        create table if not exists app_state (
 *          id text primary key,
 *          payload jsonb,
 *          updated_at timestamptz default now()
 *        );
 *   3. Add env vars (Project → Settings → API):
 *        SUPABASE_URL=https://<project>.supabase.co
 *        SUPABASE_SERVICE_KEY=<service_role key>   (server-side only)
 */
export function supabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

const ROW_ID = 'leafsolar:data';

function baseUrl(): string {
  return (process.env.SUPABASE_URL || '').replace(/\/$/, '');
}

function headers(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_KEY || '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

export async function supabaseGet(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const url = `${baseUrl()}/rest/v1/app_state?select=payload,updated_at&id=eq.${ROW_ID}`;
  const res = await fetch(url, {
    headers: headers(),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Supabase get failed: ${res.status}`);
  const rows = (await res.json()) as Array<{ payload?: unknown }>;
  if (!rows.length || rows[0].payload === undefined || rows[0].payload === null) return null;
  return JSON.stringify(rows[0].payload);
}

export async function supabasePut(value: string): Promise<void> {
  if (!supabaseConfigured()) return;
  const url = `${baseUrl()}/rest/v1/app_state?on_conflict=id`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers(),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([{
      id: ROW_ID,
      payload: JSON.parse(value),
      updated_at: new Date().toISOString(),
    }]),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Supabase put failed: ${res.status}`);
}
