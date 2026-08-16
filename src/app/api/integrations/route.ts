import { NextRequest, NextResponse } from 'next/server';
import { getIntegrations, upsertIntegration, bulkAddContacts } from '@/lib/queries';

export async function GET() {
  try {
    return NextResponse.json(getIntegrations());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const integration = upsertIntegration(body);
    return NextResponse.json(integration);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
