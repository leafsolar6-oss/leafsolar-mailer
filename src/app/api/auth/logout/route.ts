import { NextRequest, NextResponse } from 'next/server';
import { destroySession, clearSessionCookie, getTokenFromRequest } from '@/lib/auth';
import { whenStoreReady, flushNow, syncFromPersist } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — ends the CURRENT session (others stay signed in). */
export async function POST(req: NextRequest) {
  await syncFromPersist();
  const token = getTokenFromRequest(req);
  destroySession(token);
  await flushNow();
  return clearSessionCookie(NextResponse.json({ success: true }));
}
