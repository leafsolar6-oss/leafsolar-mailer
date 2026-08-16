import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { kvConfigured, kvGet, kvPut, kvUrl, kvToken } from '@/lib/kv-persist';
import { whenStoreReady } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROBE_KEY = 'leafsolar:diag'; // separate key so diagnostics never clobber real data

/** GET /api/storage/poke?write=1 — live diagnostics for the durable store.
 *  Auth required. Never returns the token value — only its presence/length.
 *  Write test uses a SEPARATE key (leafsolar:diag) to avoid touching
 *  leafsolar:data. */
export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  await whenStoreReady();

  const doWrite = req.nextUrl.searchParams.get('write') === '1';
  const out: Record<string, unknown> = {
    configured: kvConfigured(),
    url: kvUrl(),
    tokenSet: !!kvToken(),
    tokenLen: kvToken().length,
  };

  // Read test (main key)
  try {
    const v = await kvGet();
    out.readOk = true;
    out.readResult = v ? `${v.length} bytes` : 'null (no key yet)';
  } catch (e: any) {
    out.readOk = false;
    out.readError = e?.message || String(e);
  }

  // Write test (separate diag key)
  if (doWrite) {
    const probe = JSON.stringify({ probe: true, at: new Date().toISOString(), rand: Math.random() });
    try {
      const res = await fetch(`${kvUrl()}/set/${PROBE_KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken()}`, 'Content-Type': 'text/plain' },
        body: probe,
        signal: AbortSignal.timeout(10000),
      });
      out.writeOk = res.ok;
      out.writeStatus = res.status;
    } catch (e: any) {
      out.writeOk = false;
      out.writeError = e?.message || String(e);
    }
  }

  return NextResponse.json(out);
}
