import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthEmail, isAuthConfigured } from '@/lib/auth';
import { whenStoreReady } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await whenStoreReady();
  const authed = await requireAuth(req);
  return NextResponse.json({
    authenticated: authed,
    configured: isAuthConfigured(),
    email: authed ? getAuthEmail() : null,
  });
}
