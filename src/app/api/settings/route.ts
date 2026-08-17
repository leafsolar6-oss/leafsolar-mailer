import { NextRequest, NextResponse } from 'next/server';
import { getSMTPSettings, setSMTPSettings, getSetting, setSetting } from '@/lib/queries';
import { verifySMTP } from '@/lib/email';
import { requireAuth } from '@/lib/auth';
import { flushNow, syncFromPersist } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    await syncFromPersist();
    // Generic setting lookup: /api/settings?key=auto_backup
    const key = req.nextUrl.searchParams.get('key');
    if (key) return NextResponse.json({ key, value: getSetting(key) });

    const settings = getSMTPSettings();
    return NextResponse.json({ ...(settings || {}), auto_backup: getSetting('auto_backup') === 'on' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    await syncFromPersist();
    const body = await req.json();
    if (body.action === 'test') {
      const result = await verifySMTP(body);
      return NextResponse.json(result);
    }
    if (body.action === 'set' && body.key) {
      setSetting(body.key, String(body.value ?? ''));
      await flushNow();
      return NextResponse.json({ success: true });
    }
    if (body.action === 'change_password') {
      const { changePassword } = await import('@/lib/auth');
      const ok = changePassword(body.current_password, body.new_password);
      if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      await flushNow();
      return NextResponse.json({ success: true });
    }
    setSMTPSettings(body);
    await flushNow();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
