import { NextRequest, NextResponse } from 'next/server';
import {
  listMessages, listFolders, getImapSettings, getFullMessage, markSeen,
  appendToSentFolder, buildRawMessage,
} from '@/lib/imap';
import { getSetting, setSetting, addEmailLog } from '@/lib/queries';
import { requireAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const folder = req.nextUrl.searchParams.get('folder') || 'INBOX';
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30');
  const action = req.nextUrl.searchParams.get('action');

  if (action === 'folders') {
    try {
      const folders = await listFolders();
      return NextResponse.json({ folders });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'status') {
    const imap = getImapSettings();
    const stored = getSetting('imap');
    return NextResponse.json({
      configured: !!(imap || stored),
      host: imap?.host || null,
      user: imap?.user || null,
    });
  }

  // Full content of a single message (no size cap).
  if (action === 'message') {
    const uid = req.nextUrl.searchParams.get('uid') || '';
    try {
      const msg = await getFullMessage(folder, uid);
      if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      return NextResponse.json(msg);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to fetch message' }, { status: 502 });
    }
  }

  // Mark a message as read.
  if (action === 'read') {
    const uid = req.nextUrl.searchParams.get('uid') || '';
    try {
      const ok = await markSeen(folder, uid);
      return NextResponse.json({ success: ok });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  try {
    const messages = await listMessages(folder, limit);
    return NextResponse.json(messages);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch messages' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json();

    if (body.action === 'test') {
      const { testImap } = await import('@/lib/imap');
      const result = await testImap(body);
      return NextResponse.json(result);
    }

    // Reply to an inbox message: send via SMTP + append a copy to Sent.
    if (body.action === 'reply') {
      const { to, to_name, subject, body: htmlBody, in_reply_to, references } = body;
      if (!to || !subject || !htmlBody) {
        return NextResponse.json({ error: 'Recipient, subject and body are required' }, { status: 400 });
      }

      const result = await sendEmail({
        to,
        subject,
        html: htmlBody,
        inReplyTo: in_reply_to || undefined,
        references: references || undefined,
      });
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to send reply' }, { status: 502 });
      }

      // Keep a copy in the Sent folder (best-effort).
      let sentFolder: string | null = null;
      try {
        const messageId = result.messageId || `<${Date.now()}-${Math.random().toString(36).slice(2)}@leafsolar>`;
        const settings = getImapSettings();
        if (settings) {
          const raw = buildRawMessage({
            messageId,
            from: settings.user,
            fromName: 'Leaf Solar',
            to,
            subject,
            html: htmlBody,
            inReplyTo: in_reply_to || undefined,
            references: references || undefined,
          });
          sentFolder = await appendToSentFolder(raw);
        }
      } catch {
        /* non-fatal */
      }

      addEmailLog({
        campaign_id: null,
        contact_email: to,
        contact_name: to_name || '',
        subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, sentFolder });
    }

    // Save IMAP settings
    const settings = {
      host: body.host,
      port: parseInt(body.port || '993', 10),
      secure: body.secure !== false,
      user: body.user,
      pass: body.pass,
    };
    setSetting('imap', JSON.stringify(settings));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
