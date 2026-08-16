import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import store from '@/lib/store';
import { sendEmail, mergeTemplate } from '@/lib/email';
import { addEmailLog, bulkAddContacts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * Offline outbox.
 * The PWA queues write actions while offline (send email, add contacts, etc.)
 * and posts them here when back online.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: any[] = Array.isArray(body.items) ? body.items : [];
    const results: Record<string, { ok: boolean; error?: string }> = {};

    for (const item of items) {
      const { id, type, payload } = item;
      try {
        if (type === 'send_email') {
          const html = mergeTemplate(payload.body || '', {
            name: payload.to_name || '',
            email: payload.to || '',
          });
          const r = await sendEmail({
            to: payload.to,
            subject: payload.subject,
            html,
            fromName: payload.sender_name,
            fromEmail: payload.sender_email,
            replyTo: payload.reply_to,
          });
          if (!r.success) throw new Error(r.error || 'send failed');
          addEmailLog({
            campaign_id: payload.campaign_id || null,
            contact_email: payload.to,
            contact_name: payload.to_name || '',
            subject: payload.subject,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
        } else if (type === 'add_contacts') {
          bulkAddContacts(payload.contacts || []);
        } else {
          throw new Error(`Unknown outbox type: ${type}`);
        }
        results[id] = { ok: true };
      } catch (e: any) {
        results[id] = { ok: false, error: e.message };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Allow the client to register an outbox item id even before sending
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const item = {
    id: body.id || uuidv4(),
    type: body.type,
    payload: body.payload,
    created_at: new Date().toISOString(),
    attempts: 0,
  };
  store.outbox.add(item);
  return NextResponse.json(item);
}
