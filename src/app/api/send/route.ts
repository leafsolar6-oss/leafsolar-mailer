import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, mergeTemplate } from '@/lib/email';
import { addEmailLog } from '@/lib/queries';

export const dynamic = 'force-dynamic';

interface SendBody {
  to: string;
  to_name?: string;
  subject: string;
  body: string;
  sender_name?: string;
  sender_email?: string;
  reply_to?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendBody;

    if (!body.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
      return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
    }
    if (!body.subject?.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!body.body?.trim()) {
      return NextResponse.json({ error: 'Email body is required' }, { status: 400 });
    }

    const html = mergeTemplate(body.body, {
      name: body.to_name || '',
      email: body.to,
    });

    const result = await sendEmail({
      to: body.to,
      subject: body.subject,
      html,
      fromName: body.sender_name,
      fromEmail: body.sender_email,
      replyTo: body.reply_to,
    });

    addEmailLog({
      campaign_id: null,
      contact_email: body.to,
      contact_name: body.to_name || '',
      subject: body.subject,
      status: result.success ? 'sent' : 'failed',
      error: result.error || '',
      sent_at: result.success ? new Date().toISOString() : null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
