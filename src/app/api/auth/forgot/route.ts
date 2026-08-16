import { NextRequest, NextResponse } from 'next/server';
import { isAuthConfigured, getAuthEmail, createPasswordResetToken } from '@/lib/auth';
import { whenStoreReady } from '@/lib/store';
import { getSMTPSettings, getBaseUrl } from '@/lib/queries';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/forgot { email }
 * If the email matches the admin account, creates a 30-minute reset token and
 * emails a reset link using the configured SMTP. If SMTP is not configured at
 * all, returns the reset link directly so a self-hosted owner can still
 * recover (the response tells the client which case it was).
 */
export async function POST(req: NextRequest) {
  await whenStoreReady();
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: 'No admin account configured yet.' }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();
  const adminEmail = getAuthEmail().toLowerCase().trim();

  // Always return the same shape whether or not the email matches, so the
  // endpoint can't be used to probe the admin email.
  if (!email || email !== adminEmail) {
    return NextResponse.json({
      success: true,
      sent: false,
      message: 'If that email matches the admin account, a reset link will be sent.',
    });
  }

  const token = createPasswordResetToken();
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
  const smtp = getSMTPSettings();

  // No SMTP configured — surface the link directly (self-hosted fallback).
  if (!smtp || !smtp.host) {
    return NextResponse.json({
      success: true,
      sent: false,
      directLink: resetUrl,
      message: 'No email server is configured, so here is your reset link directly:',
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: 10000,
    });
    await transporter.sendMail({
      from: `"${smtp.from_name || 'Leaf Solar'}" <${smtp.from_email || smtp.user}>`,
      to: adminEmail,
      subject: 'Reset your Leaf Solar Mailer password',
      text: `Use this link to reset your Leaf Solar Mailer password (valid 30 minutes):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0f3d2e">Reset your Leaf Solar Mailer password</h2>
        <p style="color:#33473e">Use the button below to set a new password. This link is valid for <strong>30 minutes</strong>.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 32px;border-radius:12px;font-weight:800;text-decoration:none">Reset password</a>
        </p>
        <p style="color:#7a8a82;font-size:13px">If the button doesn't work, copy this link:<br><a href="${resetUrl}" style="color:#10b981">${resetUrl}</a></p>
        <p style="color:#9aa8a0;font-size:12px;margin-top:24px">Leaf Solar Mailer · if you didn't request this, ignore this email.</p>
      </div>`,
    });
    return NextResponse.json({ success: true, sent: true, message: 'Reset link sent — check your email.' });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to send the reset email: ${err?.message || 'unknown error'}` },
      { status: 500 }
    );
  }
}
