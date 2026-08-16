import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthConfigured, verifyCredentials, createSessionToken, applySessionCookie,
  checkLoginLockout, recordFailedLogin, clearLoginFailures,
} from '@/lib/auth';
import { whenStoreReady, flushNow } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await whenStoreReady();
    if (!isAuthConfigured()) {
      return NextResponse.json({ error: 'No admin account configured on this deployment.' }, { status: 400 });
    }
    const body = await req.json();
    const email = (body.email || '').trim();
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Brute-force protection: check the lockout BEFORE verifying credentials.
    const lockMsg = checkLoginLockout(email);
    if (lockMsg) {
      return NextResponse.json({ error: lockMsg }, { status: 429 });
    }

    if (!verifyCredentials(email, password)) {
      const lockMsg2 = recordFailedLogin(email);
      await flushNow(); // persist the failure counter
      return NextResponse.json(
        { error: lockMsg2 || 'Invalid email or password' },
        { status: lockMsg2 ? 429 : 401 }
      );
    }

    clearLoginFailures(email);
    const token = createSessionToken();
    await flushNow(); // persist the fresh session token
    const res = NextResponse.json({ success: true, email: email.toLowerCase().trim() });
    return applySessionCookie(res, token);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Login failed' }, { status: 500 });
  }
}
