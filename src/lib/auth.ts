/**
 * Lightweight single-admin authentication.
 *
 * No external auth provider needed — the admin account is created on first
 * run via the /welcome setup page. Passwords are salted + SHA-256 hashed
 * (never stored in plain text). Sessions are a random 256-bit token kept in
 * the JSON store and delivered as an httpOnly cookie, so the token never
 * leaks to JavaScript.
 */
import crypto from 'crypto';
import store from './store';

export const SESSION_COOKIE = 'ls_session';
const SESSION_DAYS = 30;

function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export function isAuthConfigured(): boolean {
  return store.settings.get('auth_configured') === 'true';
}

export function getAuthEmail(): string {
  return store.settings.get('auth_email') || '';
}

export function setupAdmin(email: string, password: string): void {
  const salt = crypto.randomBytes(16).toString('hex');
  store.settings.set('auth_email', email.toLowerCase().trim());
  store.settings.set('auth_salt', salt);
  store.settings.set('auth_password_hash', hashPassword(password, salt));
  store.settings.set('auth_configured', 'true');
}

export function verifyCredentials(email: string, password: string): boolean {
  const storedEmail = store.settings.get('auth_email');
  const hash = store.settings.get('auth_password_hash');
  const salt = store.settings.get('auth_salt');
  if (!storedEmail || !hash || !salt) return false;
  if (storedEmail !== email.toLowerCase().trim()) return false;
  return hashPassword(password, salt) === hash;
}

export function changePassword(currentPassword: string, newPassword: string): boolean {
  const email = store.settings.get('auth_email');
  if (!email) return false;
  if (!verifyCredentials(email, currentPassword)) return false;
  if (!newPassword || newPassword.length < 6) return false;
  const salt = crypto.randomBytes(16).toString('hex');
  store.settings.set('auth_salt', salt);
  store.settings.set('auth_password_hash', hashPassword(newPassword, salt));
  return true;
}

export function createSessionToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  store.settings.set('session_token', token);
  return token;
}

export function validateToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const current = store.settings.get('session_token');
  if (!current) return false;
  // constant-time-ish compare
  const a = Buffer.from(token);
  const b = Buffer.from(current);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function destroySession(): void {
  store.settings.set('session_token', '');
}

export function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE}=`)) {
      try {
        return decodeURIComponent(trimmed.slice(SESSION_COOKIE.length + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Guards an API route. Returns false (caller should 401) when not authed. */
export function requireAuth(req: Request): boolean {
  return validateToken(getTokenFromRequest(req));
}

export function sessionMaxAgeSeconds(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}

// ----- Next.js response cookie helpers -----

import type { NextResponse } from 'next/server';

export function applySessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMaxAgeSeconds(),
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
