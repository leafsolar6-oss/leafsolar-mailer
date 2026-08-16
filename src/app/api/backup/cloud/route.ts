import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { pushToCloudBackup } from '@/lib/backup';
import { getSetting, setSetting } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CLOUD_URL_KEY = 'cloud_backup_url';

/** POST /api/backup/cloud — push a fresh backup to the configured cloud webhook. */
export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    const url = getSetting(CLOUD_URL_KEY);
    if (!url) {
      return NextResponse.json(
        { error: 'No cloud backup URL configured. Add one on the Backups page.' },
        { status: 400 }
      );
    }
    const result = await pushToCloudBackup(url);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Cloud backup failed' }, { status: 502 });
    }
    return NextResponse.json({ success: true, sent_at: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Cloud backup failed' }, { status: 500 });
  }
}

/** PUT /api/backup/cloud — save the cloud webhook URL. */
export async function PUT(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const url = (body.url || '').trim();
    if (url && !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Cloud backup URL must start with http(s)://' }, { status: 400 });
    }
    setSetting(CLOUD_URL_KEY, url);
    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save' }, { status: 500 });
  }
}

/** GET /api/backup/cloud — current cloud webhook URL (masked). */
export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return NextResponse.json({ url: getSetting(CLOUD_URL_KEY) || '' });
}
