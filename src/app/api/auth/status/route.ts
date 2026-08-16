import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthEmail, isAuthConfigured } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authed = requireAuth(req);
  return NextResponse.json({
    authenticated: authed,
    configured: isAuthConfigured(),
    email: authed ? getAuthEmail() : null,
  });
}
