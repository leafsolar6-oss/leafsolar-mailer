import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/queries';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const stats = getStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
