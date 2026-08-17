import { NextRequest, NextResponse } from 'next/server';
import { getIntegrations, upsertIntegration, bulkAddContacts } from '@/lib/queries';
import { requireAuth } from '@/lib/auth';
import { syncFromPersist } from '@/lib/store';

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    await syncFromPersist();
    return NextResponse.json(getIntegrations());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json();
    const integration = upsertIntegration(body);
    return NextResponse.json(integration);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
