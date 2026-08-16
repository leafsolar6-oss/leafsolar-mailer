import { NextRequest, NextResponse } from 'next/server';
import { getSMTPSettings, setSMTPSettings } from '@/lib/queries';
import { verifySMTP } from '@/lib/email';

export async function GET() {
  try {
    const settings = getSMTPSettings();
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'test') {
      const result = await verifySMTP(body);
      return NextResponse.json(result);
    }
    setSMTPSettings(body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
