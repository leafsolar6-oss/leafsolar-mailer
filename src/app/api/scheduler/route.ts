import { NextRequest, NextResponse } from 'next/server';
import { processDueCampaigns } from '@/lib/campaign-send';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Scheduler endpoint — sends any campaigns whose scheduled time has passed.
 * Called by:
 *  - the in-app poller (every 60s while the app is open),
 *  - the Vercel cron (vercel.json) — Vercel adds the `x-vercel-cron` header,
 *  - anything that sends `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const isCron = req.headers.get('x-vercel-cron') === '1' ||
    req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!isCron && !(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const result = await processDueCampaigns();
    return NextResponse.json({ ...result, checked_at: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Scheduler failed' }, { status: 500 });
  }
}
