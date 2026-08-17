import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { flushNow, syncFromPersist } from '@/lib/store';
import {
  createBackupPayload, writeBackupFile, listServerBackups, readServerBackupFile,
} from '@/lib/backup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Backups.
 *  - GET  /api/backup             -> fresh backup payload (download it client-side)
 *  - GET  /api/backup?file=name   -> a stored server snapshot
 *  - GET  /api/backup?list=1      -> list of stored server snapshots
 *  - POST /api/backup             -> create a dated snapshot on the server
 */
export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    const file = req.nextUrl.searchParams.get('file');
    if (file) {
      const content = readServerBackupFile(file);
      if (!content) return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${file}"`,
        },
      });
    }
    if (req.nextUrl.searchParams.get('list') === '1') {
      return NextResponse.json(listServerBackups());
    }
    const payload = createBackupPayload();
    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Backup failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    await syncFromPersist();
    const file = writeBackupFile();
    await flushNow();
    return NextResponse.json({ success: true, file, meta: createBackupPayload().meta });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Backup failed' }, { status: 500 });
  }
}
