import { NextResponse } from 'next/server';
import { kvConfigured } from '@/lib/kv-persist';
import { supabaseConfigured } from '@/lib/supabase-persist';
import { isAuthConfigured } from '@/lib/auth';
import { getSMTPSettings } from '@/lib/queries';
import { whenStoreReady } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public health endpoint (non-sensitive booleans only — no tokens, no data).
 * Lets you confirm from anywhere whether the live deployment has durable
 * storage, SMTP, and whether an admin account exists.
 */
export async function GET() {
  await whenStoreReady();
  return NextResponse.json({
    ok: true,
    version: '1.1.2',
    time: new Date().toISOString(),
    auth: {
      configured: isAuthConfigured(),
    },
    storage: {
      durable: kvConfigured() || supabaseConfigured(),
      redis: kvConfigured(),
      supabase: supabaseConfigured(),
    },
    smtpConfigured: !!getSMTPSettings(),
  });
}
