import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getEmailLogs } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/campaigns/export?campaignId=... — CSV delivery report (with analytics). */
export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const campaignId = req.nextUrl.searchParams.get('campaignId') || undefined;
  const logs = getEmailLogs(campaignId, 100000);

  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = ['email', 'name', 'status', 'subject', 'opened', 'clicked', 'open_count', 'click_count', 'opened_at', 'clicked_at', 'error', 'sent_at'];
  const rows = logs.map(l => [
    l.contact_email,
    l.contact_name,
    l.status,
    l.subject,
    l.opened_at ? 'yes' : 'no',
    l.clicked_at ? 'yes' : 'no',
    l.open_count || 0,
    l.click_count || 0,
    l.opened_at || '',
    l.clicked_at || '',
    l.error || '',
    l.sent_at || '',
  ].map(esc).join(','));

  const csv = [header.join(','), ...rows].join('\n');
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="delivery-report-${campaignId?.slice(0, 8) || 'all'}-${stamp}.csv"`,
    },
  });
}
