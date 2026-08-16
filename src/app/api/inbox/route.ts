import { NextRequest, NextResponse } from 'next/server';
import { listMessages, listFolders, getImapSettings } from '@/lib/imap';
import { getSetting, setSetting } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  try {
    const messages = await listMessages(folder, limit);
    return NextResponse.json(messages);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch messages' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'test') {
      const { testImap } = await import('@/lib/imap');
      const result = await testImap(body);
      return NextResponse.json(result);
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
