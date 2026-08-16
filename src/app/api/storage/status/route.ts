import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getStorageStatus } from '@/lib/storage-status';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/storage/status  — durable storage config; ?test=1 runs a live check. */
export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const test = req.nextUrl.searchParams.get('test') === '1';
  try {
    const status = await getStorageStatus(test);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Storage status failed' }, { status: 500 });
  }
}
