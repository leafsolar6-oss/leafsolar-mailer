import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaignById, updateCampaign, getListContactIds,
  getContactById, addEmailLog
} from '@/lib/queries';
import { sendEmail, mergeTemplate } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = await req.json();
    const campaign = getCampaignById(campaignId);
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    // Gather recipient IDs from selected lists
    const recipientIds = new Set<string>();
    for (const listId of campaign.list_ids) {
      const ids = getListContactIds(listId);
      ids.forEach(id => recipientIds.add(id));
    }

    if (recipientIds.size === 0) {
      return NextResponse.json({ error: 'No recipients found. Add contacts to your selected lists.' }, { status: 400 });
    }

    updateCampaign(campaignId, { status: 'sending', recipient_count: recipientIds.size });

    let sent = 0, failed = 0;
    const errors: string[] = [];

    for (const contactId of recipientIds) {
      const contact = getContactById(contactId);
      if (!contact || contact.status !== 'active') continue;

      const personalizedHtml = mergeTemplate(campaign.body, {
        name: contact.name,
        email: contact.email,
        company: contact.company,
      });

      const subject = mergeTemplate(campaign.subject, {
        name: contact.name,
        email: contact.email,
        company: contact.company,
      });

      const result = await sendEmail({
        to: contact.email,
        subject,
        html: personalizedHtml,
        fromName: campaign.sender_name,
        fromEmail: campaign.sender_email,
        replyTo: campaign.reply_to,
      });

      if (result.success) {
        sent++;
        addEmailLog({
          campaign_id: campaignId,
          contact_email: contact.email,
          contact_name: contact.name,
          subject,
          status: 'sent',
        });
      } else {
        failed++;
        errors.push(`${contact.email}: ${result.error}`);
        addEmailLog({
          campaign_id: campaignId,
          contact_email: contact.email,
          contact_name: contact.name,
          subject,
          status: 'failed',
          error: result.error,
        });
      }
    }

    updateCampaign(campaignId, {
      status: failed > 0 && sent === 0 ? 'failed' : 'sent',
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: recipientIds.size,
      errors: errors.slice(0, 20),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
