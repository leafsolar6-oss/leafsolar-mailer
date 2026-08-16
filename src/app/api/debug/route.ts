import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    smtp_host_set: !!process.env.SMTP_HOST,
    smtp_host: process.env.SMTP_HOST || null,
    smtp_port: process.env.SMTP_PORT || null,
    smtp_user_set: !!process.env.SMTP_USER,
    smtp_user: process.env.SMTP_USER ? process.env.SMTP_USER.slice(0, 6) + '***' : null,
    smtp_pass_set: !!process.env.SMTP_PASS,
    smtp_from: process.env.SMTP_FROM_EMAIL || null,
    database_path: process.env.DATABASE_PATH || null,
    node_env: process.env.NODE_ENV || null,
    vercel: process.env.VERCEL || null,
  });
}
