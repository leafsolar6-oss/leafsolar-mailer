import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, getCampaignById } from '@/lib/queries';

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const campaigns = getCampaigns();
    return NextResponse.json(campaigns);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json();
    // Accept a scheduled_at ISO string; keep it null unless valid.
    const scheduled_at = body.scheduled_at && !isNaN(Date.parse(body.scheduled_at))
      ? new Date(body.scheduled_at).toISOString()
      : null;
    const campaign = createCampaign({ ...body, scheduled_at });
    // A campaign created with a future scheduled_at starts as "scheduled".
    if (scheduled_at && scheduled_at > new Date().toISOString() && campaign.status === 'draft') {
      updateCampaign(campaign.id, { status: 'scheduled' });
    }
    return NextResponse.json(getCampaignById(campaign.id));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    if (data.scheduled_at !== undefined) {
      data.scheduled_at = data.scheduled_at && !isNaN(Date.parse(data.scheduled_at))
        ? new Date(data.scheduled_at).toISOString()
        : null;
    }
    updateCampaign(id, data);
    return NextResponse.json(getCampaignById(id));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const { id } = await req.json();
    deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
