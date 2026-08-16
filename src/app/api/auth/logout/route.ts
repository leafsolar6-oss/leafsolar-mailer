import { NextResponse } from 'next/server';
import { destroySession, clearSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  destroySession();
  return clearSessionCookie(NextResponse.json({ success: true }));
}
