import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { addFcmToken, removeFcmToken } from '@/lib/fcm';
import { flushNow } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/push/register { token } — the native app registers its FCM device
 *   token so the server can push notifications when the app is closed.
 * POST /api/push/register { token, unregister: true } — removes a token.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const token = (body.token || '').trim();
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  if (body.unregister) removeFcmToken(token);
  else addFcmToken(token);

  await flushNow();
  return NextResponse.json({ success: true });
}
