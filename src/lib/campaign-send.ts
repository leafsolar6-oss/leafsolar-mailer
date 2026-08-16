/**
 * Shared bulk-send logic used by:
 *  - POST /api/campaigns/send (manual "Send Now")
 *  - GET  /api/scheduler      (auto-send of due scheduled campaigns)
 *
 * Per recipient: personalization merge, tracking injection (click rewrite,
 * open pixel, unsubscribe link), SMTP send, delivery log with tracking id.
 */
import {
  getCampaignById, getCampaigns, updateCampaign, getListContactIds,
  getContactById, addEmailLog,
} from './queries';
import { sendEmail, mergeTemplate, addTrackingToHtml, makeTrackingId } from './email';
import { isAutoBackupEnabled, writeBackupFile } from './backup';

export interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  errors: string[];
  campaign_id: string;
}

export async function sendCampaignById(campaignId: string): Promise<SendResult> {
  const campaign = getCampaignById(campaignId);
  if (!campaign) {
    return { success: false, sent: 0, failed: 0, total: 0, errors: ['Campaign not found'], campaign_id: campaignId };
  }

  const recipientIds = new Set<string>();
  for (const listId of campaign.list_ids) {
    getListContactIds(listId).forEach(id => recipientIds.add(id));
  }

  if (recipientIds.size === 0) {
    return {
      success: false, sent: 0, failed: 0, total: 0,
      errors: ['No recipients found. Add contacts to your selected lists.'],
      campaign_id: campaignId,
    };
  }

  updateCampaign(campaignId, { status: 'sending', recipient_count: recipientIds.size });

  // Narrow the campaign type for use inside the worker closures below.
  const c = campaign;

  // Best-effort mirroring of sent campaign emails into the mailbox's Sent
  // folder (only when IMAP is configured and the send is small enough to stay
  // inside serverless limits).
  const SENT_COPY_CAP = 30;
  const sentCopies: { to: string; subject: string; html: string; messageId?: string }[] = [];

  // Send in parallel with a bounded concurrency (matches the nodemailer pool's
  // maxConnections) so a full campaign finishes inside serverless time limits
  // instead of one-by-one.
  const CONCURRENCY = 5;
  const recipients = [...recipientIds];
  let sent = 0, failed = 0;
  const errors: string[] = [];

  async function worker(): Promise<void> {
    while (true) {
      const contactId = recipients.shift();
      if (!contactId) return;
      const contact = getContactById(contactId);
      if (!contact || contact.status !== 'active') continue;

      const trackingId = makeTrackingId(contact.email, campaignId);
      const personalizedHtml = mergeTemplate(c.body, {
        name: contact.name,
        email: contact.email,
        company: contact.company,
      });
      const html = addTrackingToHtml(personalizedHtml, trackingId);

      const subject = mergeTemplate(c.subject, {
        name: contact.name,
        email: contact.email,
        company: contact.company,
      });

      const result = await sendEmail({
        to: contact.email,
        subject,
        html,
        fromName: c.sender_name,
        fromEmail: c.sender_email,
        replyTo: c.reply_to,
      });

      if (result.success) {
        sent++;
        if (sentCopies.length < SENT_COPY_CAP) {
          sentCopies.push({ to: contact.email, subject, html, messageId: result.messageId });
        }
        addEmailLog({
          campaign_id: campaignId,
          contact_email: contact.email,
          contact_name: contact.name,
          subject,
          status: 'sent',
          sent_at: new Date().toISOString(),
          tracking_id: trackingId,
        });
      } else {
        failed++;
        if (errors.length < 100) errors.push(`${contact.email}: ${result.error}`);
        addEmailLog({
          campaign_id: campaignId,
          contact_email: contact.email,
          contact_name: contact.name,
          subject,
          status: 'failed',
          error: result.error,
          tracking_id: trackingId,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, () => worker()));

  updateCampaign(campaignId, {
    status: failed > 0 && sent === 0 ? 'failed' : 'sent',
    sent_count: sent,
    failed_count: failed,
    sent_at: new Date().toISOString(),
    scheduled_at: null,
  });

  // Best-effort: save copies of the sent campaign emails into the mailbox's
  // Sent folder (when IMAP is configured). Skipped for large sends to stay
  // within serverless time limits.
  if (sentCopies.length > 0) {
    try {
      const { getImapSettings, appendManyToSentFolder, buildRawMessage } = await import('./imap');
      if (getImapSettings()) {
        const raws = sentCopies.map(copy => buildRawMessage({
          messageId: copy.messageId || `<${Date.now()}-${Math.random().toString(36).slice(2)}@leafsolar>`,
          from: getImapSettings()!.user,
          fromName: c.sender_name || 'Leaf Solar',
          to: copy.to,
          subject: copy.subject,
          html: copy.html,
        }));
        await appendManyToSentFolder(raws);
      }
    } catch {
      /* non-fatal */
    }
  }

  // Safety snapshot after a bulk send when auto-backup is enabled.
  if (isAutoBackupEnabled()) {
    try {
      writeBackupFile();
    } catch {
      /* non-fatal */
    }
  }

  return {
    success: true, sent, failed, total: recipientIds.size, errors: errors.slice(0, 20), campaign_id: campaignId,
  };
}

/** Sends any campaigns whose scheduled_at time has passed. */
export async function processDueCampaigns(nowIso?: string): Promise<{ processed: string[]; sent: number; failed: number }> {
  const ref = nowIso || new Date().toISOString();
  const due = getCampaigns().filter(c =>
    c.status === 'scheduled' && c.scheduled_at && c.scheduled_at <= ref
  );
  const processed: string[] = [];
  let sent = 0, failed = 0;
  for (const c of due) {
    processed.push(c.id);
    const r = await sendCampaignById(c.id);
    sent += r.sent;
    failed += r.failed;
  }
  return { processed, sent, failed };
}
