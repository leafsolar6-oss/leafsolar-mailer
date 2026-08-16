import { NextResponse } from 'next/server';
import { destroySession, clearSessionCookie } from '@/lib/auth';
import { whenStoreReady } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST() {
  await whenStoreReady();
  destroySession();
  return clearSessionCookie(NextResponse.json({ success: true }));
}
