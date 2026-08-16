import { NextRequest, NextResponse } from 'next/server';
import { getEmailLogs } from '@/lib/queries';

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaignId') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');
    const logs = getEmailLogs(campaignId, limit);
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
