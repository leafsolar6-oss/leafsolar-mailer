import { NextRequest, NextResponse } from 'next/server';
import { findLogByTrackingId, setContactStatus } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public unsubscribe endpoint.
 *  - GET  /api/unsubscribe?id=<trackingId>  -> { email, name, status } so the
 *    /unsubscribe page can confirm who is unsubscribing.
 *  - POST /api/unsubscribe { email }        -> marks the contact unsubscribed
 *    (suppressed from future sends).
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const log = findLogByTrackingId(id);
  if (!log) {
    return NextResponse.json({ error: 'Unknown unsubscribe link', email: null, status: null }, { status: 404 });
  }
  return NextResponse.json({ email: log.contact_email, name: log.contact_name, status: 'ok' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    const changed = setContactStatus(email, 'unsubscribed');
    return NextResponse.json({ success: true, changed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unsubscribe failed' }, { status: 500 });
  }
}
