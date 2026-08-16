/**
 * Lightweight single-admin authentication.
 *
 * No external auth provider needed — the admin account is created on first
 * setup. Passwords are salted + SHA-256 hashed (never stored in plain text).
 * Sessions are random 256-bit tokens kept in the JSON store and delivered as
 * httpOnly cookies, so tokens never leak to JavaScript. Multiple concurrent
 * sessions are supported (up to 10), so logging in on another device doesn't
 * invalidate this one.
 */
import crypto from 'crypto';
import store, { whenStoreReady } from './store';

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

// ----- Login rate limiting (brute-force protection) -----
// Counters live in the settings map (mirrored to durable storage), so limits
// are shared across serverless instances. 5 failed attempts within 15 minutes
// locks that email for 15 minutes.

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

function failKey(email: string): string {
  const h = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16);
  return `login_fail_${h}`;
}

interface FailState { count: number; first: number; locked_until: number; }

function readFailState(email: string): FailState {
  const raw = store.settings.get(failKey(email));
  if (raw) {
    try {
      const p = JSON.parse(raw) as FailState;
      // Expire stale windows.
      if (Date.now() - p.first > WINDOW_MS && Date.now() > p.locked_until) {
        return { count: 0, first: 0, locked_until: 0 };
      }
      return p;
    } catch { /* fall through */ }
  }
  return { count: 0, first: 0, locked_until: 0 };
}

function writeFailState(email: string, s: FailState): void {
  store.settings.set(failKey(email), JSON.stringify(s));
}

/** Returns an error string if the email is currently locked out. */
export function checkLoginLockout(email: string): string | null {
  const s = readFailState(email);
  if (s.locked_until > Date.now()) {
    const mins = Math.ceil((s.locked_until - Date.now()) / 60000);
    return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`;
  }
  return null;
}

/** Records a failed attempt. Returns the lock message once locked. */
export function recordFailedLogin(email: string): string | null {
  const s = readFailState(email);
  const now = Date.now();
  const count = (s.first && now - s.first <= WINDOW_MS ? s.count : 0) + 1;
  const next: FailState = {
    count,
    first: s.first && now - s.first <= WINDOW_MS ? s.first : now,
    locked_until: 0,
  };
  if (count >= MAX_FAILS) next.locked_until = now + LOCK_MS;
  writeFailState(email, next);
  return next.locked_until ? 'Too many failed attempts. Try again in 15 minutes.' : null;
}

/** Clears failure counters after a successful login. */
export function clearLoginFailures(email: string): void {
  store.settings.set(failKey(email), '');
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

// ----- Password reset (email-based, for the single admin) -----

export function createPasswordResetToken(): string {
  const token = crypto.randomBytes(24).toString('hex');
  store.settings.set('auth_reset_token', token);
  store.settings.set('auth_reset_expires', String(Date.now() + 30 * 60 * 1000)); // 30 min
  return token;
}

export function resetPasswordWithToken(
  token: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const stored = store.settings.get('auth_reset_token');
  const expires = parseInt(store.settings.get('auth_reset_expires') || '0', 10);
  if (!stored || stored !== token) return { ok: false, error: 'Invalid or expired reset link' };
  if (Date.now() > expires) return { ok: false, error: 'Reset link expired. Request a new one.' };
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' };
  }
  const email = store.settings.get('auth_email');
  if (!email) return { ok: false, error: 'No admin account configured' };
  const salt = crypto.randomBytes(16).toString('hex');
  store.settings.set('auth_salt', salt);
  store.settings.set('auth_password_hash', hashPassword(newPassword, salt));
  store.settings.set('auth_reset_token', '');
  store.settings.set('auth_reset_expires', '');
  return { ok: true };
}

const MAX_SESSIONS = 10;

/** All valid session tokens (a set, so multiple devices stay signed in). */
export function getSessionTokens(): string[] {
  const raw = store.settings.get('session_tokens');
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch { /* fall through to legacy */ }
  }
  // Migrate the legacy single-token key.
  const legacy = store.settings.get('session_token');
  return legacy ? [legacy] : [];
}

function setSessionTokens(tokens: string[]): void {
  store.settings.set('session_tokens', JSON.stringify(tokens.slice(-MAX_SESSIONS)));
}

export function createSessionToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const tokens = getSessionTokens();
  tokens.push(token);
  setSessionTokens(tokens);
  return token;
}

export function validateToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const tokens = getSessionTokens();
  if (!tokens.length) return false;
  const buf = Buffer.from(token);
  if (buf.length !== 64) return false; // tokens are 64 hex chars
  return tokens.some(t => {
    const b = Buffer.from(t);
    return b.length === buf.length && crypto.timingSafeEqual(b, buf);
  });
}

/** Removes a specific session (or all when no token is given). */
export function destroySession(token?: string | null): void {
  if (!token) { setSessionTokens([]); return; }
  setSessionTokens(getSessionTokens().filter(t => t !== token));
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
export async function requireAuth(req: Request): Promise<boolean> {
  await whenStoreReady(); // avoid reading pre-hydration state on cold starts
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
