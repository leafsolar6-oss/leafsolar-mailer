import { NextRequest, NextResponse } from 'next/server';
import { getEmailLogs } from '@/lib/queries';
import { requireAuth } from '@/lib/auth';
import { syncFromPersist } from '@/lib/store';

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    await syncFromPersist();
    const campaignId = req.nextUrl.searchParams.get('campaignId') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');
    const logs = getEmailLogs(campaignId, limit);
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
