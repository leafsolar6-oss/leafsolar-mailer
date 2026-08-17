import { NextRequest, NextResponse } from 'next/server';
import { processDueCampaigns } from '@/lib/campaign-send';
import { requireAuth } from '@/lib/auth';
import { getImapSettings, listMessages } from '@/lib/imap';
import { sendFcm, getFcmTokens, getLastPushedInboxId, setLastPushedInboxId } from '@/lib/fcm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Scheduler endpoint — runs periodically (Vercel cron, GitHub Actions every
 * 10 min, or the in-app poller):
 *  - sends any campaigns whose scheduled time has passed
 *  - checks for NEW inbox mail and pushes an FCM notification (so alerts
 *    arrive even when the app is fully closed — requires FCM configured)
 */
async function checkNewMailAndPush(): Promise<{ newMail: boolean }> {
  const imap = getImapSettings();
  if (!imap) return { newMail: false };
  const tokens = getFcmTokens();
  try {
    const msgs = await listMessages('INBOX', 1);
    if (!msgs.length) return { newMail: false };
    const latest = msgs[0];
    const lastId = getLastPushedInboxId();
    if (lastId && latest.id !== lastId && !latest.seen) {
      const sender = latest.from_name || latest.from || 'someone';
      await sendFcm(`📥 New email from ${sender}`, latest.subject || 'You have a new message');
      setLastPushedInboxId(latest.id);
      return { newMail: true };
    }
    if (!lastId) setLastPushedInboxId(latest.id); // baseline, no alert yet
    return { newMail: false };
  } catch {
    return { newMail: false };
  }
}

export async function GET(req: NextRequest) {
  const isCron = req.headers.get('x-vercel-cron') === '1' ||
    req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!isCron && !(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const result = await processDueCampaigns();
    const mail = await checkNewMailAndPush();
    return NextResponse.json({ ...result, ...mail, checked_at: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Scheduler failed' }, { status: 500 });
  }
}

