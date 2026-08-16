import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { flushNow } from '@/lib/store';
import { getCampaignById, updateCampaign } from '@/lib/queries';
import { sendCampaignById } from '@/lib/campaign-send';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/campaigns/send { campaignId }
 * Sends a campaign immediately. If the campaign has a future scheduled_at it
 * stays "scheduled" (the scheduler auto-sends it when the time comes).
 */
export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const { campaignId } = await req.json();
    const campaign = getCampaignById(campaignId);
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    if (campaign.scheduled_at && campaign.scheduled_at > new Date().toISOString()) {
      updateCampaign(campaignId, { status: 'scheduled' });
      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduled_at: campaign.scheduled_at,
        message: 'Campaign scheduled — it will send automatically at the scheduled time.',
      });
    }

    const result = await sendCampaignById(campaignId);
    if (!result.success) {
      return NextResponse.json({ error: result.errors[0] || 'Failed to send' }, { status: 400 });
    }
    await flushNow();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to send' }, { status: 500 });
  }
}
