import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthConfigured, verifyCredentials, createSessionToken, applySessionCookie,
} from '@/lib/auth';
import { whenStoreReady, flushNow } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await whenStoreReady();
    if (!isAuthConfigured()) {
      return NextResponse.json({ error: 'No admin account yet. Set one up on the welcome page.' }, { status: 400 });
    }
    const body = await req.json();
    const email = (body.email || '').trim();
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (!verifyCredentials(email, password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = createSessionToken();
    await flushNow(); // persist the fresh session token
    const res = NextResponse.json({ success: true, email: email.toLowerCase().trim() });
    return applySessionCookie(res, token);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Login failed' }, { status: 500 });
  }
}
