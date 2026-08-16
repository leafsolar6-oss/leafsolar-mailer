import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordWithToken, createSessionToken, applySessionCookie, getAuthEmail } from '@/lib/auth';
import { whenStoreReady } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/auth/reset { token, password, confirm } — sets a new password. */
export async function POST(req: NextRequest) {
  await whenStoreReady();
  const body = await req.json().catch(() => ({}));
  const token = (body.token || '').trim();
  const password = body.password || '';
  const confirm = body.confirm || '';

  if (!token) return NextResponse.json({ error: 'Missing reset token' }, { status: 400 });
  if (password !== confirm) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
  }

  const result = resetPasswordWithToken(token, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Log them straight in with a fresh session.
  const session = createSessionToken();
  const res = NextResponse.json({ success: true, email: getAuthEmail() });
  return applySessionCookie(res, session);
}
