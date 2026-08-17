import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendFcm } from '@/lib/fcm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/push/send { title, body } — pushes a notification to every
 * registered device. Useful for testing the FCM wiring and for future
 * server-side alerts (e.g. campaign finished, reply received).
 */
export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const title = (body.title || 'Leaf Solar Mailer').slice(0, 100);
  const text = (body.body || '').slice(0, 200);

  const result = await sendFcm(title, text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Push failed' }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
