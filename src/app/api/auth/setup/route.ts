import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthConfigured, setupAdmin, createSessionToken, applySessionCookie, getAuthEmail,
} from '@/lib/auth';
import { setSMTPSettings } from '@/lib/queries';
import { whenStoreReady, flushNow } from '@/lib/store';
import type { SMTPSettings } from '@/types';

export const dynamic = 'force-dynamic';

/** GET: first-run status — whether an admin account is configured. */
export async function GET() {
  await whenStoreReady();
  return NextResponse.json({ configured: isAuthConfigured(), email: getAuthEmail() });
}

/** POST: create the admin account (only allowed before any account exists). */
export async function POST(req: NextRequest) {
  try {
    await whenStoreReady();
    if (isAuthConfigured()) {
      return NextResponse.json({ error: 'Already configured. Please log in.' }, { status: 400 });
    }
    const body = await req.json();
    const email = (body.email || '').trim();
    const password = body.password || '';
    const confirm = body.confirm || '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid admin email is required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (password !== confirm) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    setupAdmin(email, password);

    // Optional SMTP quick-config during onboarding.
    if (body.smtp_host && body.smtp_user) {
      const smtp: SMTPSettings = {
        host: body.smtp_host,
        port: parseInt(body.smtp_port || '587', 10),
        secure: body.smtp_secure === true || body.smtp_port === '465',
        user: body.smtp_user,
        pass: body.smtp_pass || '',
        from_name: body.smtp_from_name || 'Leaf Solar',
        from_email: body.smtp_from_email || body.smtp_user,
      };
      setSMTPSettings(smtp);
    }

    const token = createSessionToken();
    await flushNow(); // persist the account + session BEFORE responding
    const res = NextResponse.json({ success: true, email });
    return applySessionCookie(res, token);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Setup failed' }, { status: 500 });
  }
}
