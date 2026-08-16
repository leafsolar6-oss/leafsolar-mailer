import nodemailer from 'nodemailer';
import { getSMTPSettings } from './queries';
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
