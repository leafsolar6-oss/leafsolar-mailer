import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export interface ImapSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  from_name: string;
  to: string;
  subject: string;
  date: string;
  preview: string;
  seen: boolean;
  body_html: string;
  body_text: string;
}

export function getImapSettings(): ImapSettings | null {
  // Env vars first (persistent), then fall back to stored settings
  if (process.env.IMAP_HOST && process.env.IMAP_USER) {
    return {
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      secure: process.env.IMAP_SECURE !== 'false',
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS || '',
    };
  }
  try {
    const raw = require('./queries').getSetting('imap');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function withClient<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const settings = getImapSettings();
  if (!settings) throw new Error('IMAP not configured');
  const client = new ImapFlow({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.user, pass: settings.pass },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });
  try {
    await client.connect();
    return await fn(client);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}

export async function listFolders(): Promise<string[]> {
  return withClient(async (client) => {
    const tree = await client.list();
    const folders: string[] = [];
    const walk = (entries: any[]) => {
      for (const e of entries || []) {
        if (e.path) folders.push(e.path);
        if (e.folders) walk(e.folders);
      }
    };
    walk(tree as any);
    return folders;
  });
}

export async function listMessages(folder = 'INBOX', limit = 30): Promise<EmailMessage[]> {
  return withClient(async (client) => {
    await client.mailboxOpen(folder);
    const mailbox = client.mailbox as any;
    const total = (mailbox && mailbox.exists) || 0;
    const start = Math.max(1, total - limit + 1);
    const range = `${start}:${total}`;
    const messages: EmailMessage[] = [];

    for await (const msg of client.fetch(range, {
      envelope: true,
      flags: true,
      source: { start: 0, maxLength: 50000 },
    }, { binary: false })) {
      let subject = msg.envelope?.subject || '(no subject)';
      // Decode encoded-word subjects
      try { subject = decodeEncoded(subject); } catch { /* keep raw */ }

      const fromAddr = msg.envelope?.from?.[0];
      const fromEmail = fromAddr?.address || '';
      const fromName = decodeEncoded(fromAddr?.name || '');

      let body_text = '';
      let body_html = '';
      let preview = '';
      try {
        const parsed = await simpleParser(msg.source as any);
        body_text = parsed.text || '';
        body_html = parsed.html || '';
        preview = (body_text || body_html.replace(/<[^>]+>/g, ' ') || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      } catch {
        preview = '(could not parse)';
      }

      messages.push({
        id: String(msg.uid || msg.seq || Math.random()),
        from: fromEmail,
        from_name: fromName,
        to: (msg.envelope?.to || []).map((t: any) => t.address).filter(Boolean).join(', '),
        subject,
        date: new Date((msg.envelope?.date as unknown as string) || (msg.internalDate as unknown as string) || Date.now()).toISOString(),
        preview,
        seen: (msg.flags || new Set()).has('\\Seen'),
        body_html,
        body_text,
      });
    }

    return messages.reverse();
  });
}

export async function getMessage(folder: string, uid: string): Promise<EmailMessage | null> {
  const messages = await listMessages(folder, 200);
  return messages.find(m => m.id === uid) || null;
}

/** Decode RFC 2047 encoded words like =?UTF-8?B?...?= */
function decodeEncoded(str: string): string {
  if (!str) return '';
  return str.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (_match: string, charset: string, encoding: string, text: string) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return Buffer.from(text, 'base64').toString(charset.toLowerCase().startsWith('utf') ? 'utf-8' : 'latin1');
      }
      // Q encoding
      const decoded = text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_, h) =>
        String.fromCharCode(parseInt(h, 16))
      );
      return Buffer.from(decoded, 'latin1').toString(charset.toLowerCase().startsWith('utf') ? 'utf-8' : 'latin1');
    } catch {
      return text;
    }
  });
}

export async function testImap(s: ImapSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new ImapFlow({
      host: s.host,
      port: s.port,
      secure: s.secure,
      auth: { user: s.user, pass: s.pass },
      logger: false,
      connectionTimeout: 10000,
    });
    await client.connect();
    await client.list();
    await client.logout();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
