import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getSMTPSettings, getBaseUrl } from './queries';
import type { SMTPSettings } from '@/types';

let transporter: nodemailer.Transporter | null = null;
let lastConfig: string | null = null;

export function getTransporter(): nodemailer.Transporter {
  const settings = getSMTPSettings();
  if (!settings) {
    throw new Error('SMTP not configured. Please configure email settings first.');
  }
  const configStr = JSON.stringify(settings);
  if (transporter && lastConfig === configStr) return transporter;

  transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.user, pass: settings.pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10,
  });
  lastConfig = configStr;
  return transporter;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = getSMTPSettings();
    if (!settings) throw new Error('SMTP not configured');

    const t = getTransporter();
    const fromName = options.fromName || settings.from_name || 'Leaf Solar';
    const fromEmail = options.fromEmail || settings.from_email || settings.user;

    await t.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo || fromEmail,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export function mergeTemplate(html: string, data: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value || '');
  }
  return result;
}

export async function verifySMTP(settings: SMTPSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const t = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.user, pass: settings.pass },
      connectionTimeout: 10000,
    });
    await t.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

// ==================== OPEN / CLICK TRACKING ====================
// Each delivery gets a unique tracking id. We rewrite outbound links through
// /api/t (click redirect) and append a 1x1 pixel (open) plus an unsubscribe
// link. The tracking id is stored on the EmailLog so per-recipient analytics
// (who opened, who clicked, how many times) can be shown in the UI.

export function makeTrackingId(email: string, campaignId: string | null): string {
  const raw = `${campaignId || 'single'}:${email.toLowerCase()}:${Date.now()}:${Math.random()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

function pixelUrl(trackingId: string): string {
  return `${getBaseUrl()}/api/t?type=open&id=${trackingId}`;
}

export function injectTrackingPixel(html: string, trackingId: string): string {
  const pixel = `<img src="${pixelUrl(trackingId)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${pixel}</body>`);
  return `${html}${pixel}`;
}

export function rewriteLinks(html: string, trackingId: string): string {
  const base = getBaseUrl();
  return html.replace(
    /<a\s+([^>]*?)href="(https?:\/\/[^"]+)"([^>]*)>/gi,
    (_m, before: string, href: string, after: string) => {
      const target = encodeURIComponent(href);
      return `<a ${before}href="${base}/api/t?type=click&id=${trackingId}&url=${target}"${after}>`;
    }
  );
}

export function injectUnsubscribeLink(html: string, trackingId: string, label = 'Unsubscribe'): string {
  const base = getBaseUrl();
  const link = `<a href="${base}/unsubscribe?id=${trackingId}" style="color:#888888;">${label}</a>`;
  const withTag = html.replace(/\{\{\s*unsubscribe\s*\}\}/gi, link);
  if (withTag !== html) return withTag;
  return `${withTag}\n<p style="font-size:11px;color:#888888;text-align:center;margin:16px 0 0;">${link} · <a href="https://www.leafsolar.ng" style="color:#888888;">Leaf Solar</a></p>`;
}

/** Applies per-recipient tracking (click rewrite + pixel + unsubscribe). */
export function addTrackingToHtml(html: string, trackingId: string, opts?: { withUnsubscribe?: boolean }): string {
  let out = rewriteLinks(html, trackingId);
  out = injectTrackingPixel(out, trackingId);
  if (opts?.withUnsubscribe !== false) out = injectUnsubscribeLink(out, trackingId);
  return out;
}
