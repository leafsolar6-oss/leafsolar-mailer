import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { flushNow, syncFromPersist } from '@/lib/store';
import { restoreFromPayload, writeBackupFile } from '@/lib/backup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/backup/restore — replaces the whole store with an uploaded backup. */
export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    await syncFromPersist();
    const body = await req.json();
    if (!body || !body.data) {
      return NextResponse.json({ error: 'Upload a valid backup file (JSON)' }, { status: 400 });
    }

    // Safety: snapshot the current data before overwriting.
    try {
      writeBackupFile();
    } catch {
      /* non-fatal */
    }

    const result = restoreFromPayload(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Invalid backup file' }, { status: 400 });
    }
    await flushNow();
    return NextResponse.json({ success: true, counts: result.counts });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Restore failed' }, { status: 500 });
  }
}
