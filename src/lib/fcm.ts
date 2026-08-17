/**
 * Firebase Cloud Messaging (FCM) — server-side push.
 *
 * Sends notifications to the user's device token(s) so alerts arrive even
 * when the app is fully closed. Uses the FCM legacy HTTP API, which only
 * needs the FCM server key (set FCM_SERVER_KEY in Vercel env).
 *
 * The device token is registered by the native app via
 * POST /api/push/register (auth). Until Firebase is configured
 * (google-services.json + plugin), nothing here is used — all calls are
 * safe no-ops when no server key / no tokens exist.
 */
import { getSetting, setSetting } from './queries';

const TOKENS_KEY = 'fcm_tokens';

export function getFcmTokens(): string[] {
  const raw = getSetting(TOKENS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function addFcmToken(token: string): string[] {
  const tokens = getFcmTokens();
  if (!tokens.includes(token)) tokens.push(token);
  // Cap at 10 (only one admin device really).
  setSetting(TOKENS_KEY, JSON.stringify(tokens.slice(-10)));
  return getFcmTokens();
}

export function removeFcmToken(token: string): void {
  setSetting(TOKENS_KEY, JSON.stringify(getFcmTokens().filter(t => t !== token)));
}

/** Sends an FCM notification to all registered devices (best-effort). */
export async function sendFcm(title: string, body: string, data: Record<string, string> = {}): Promise<{ ok: boolean; error?: string }> {
  const serverKey = process.env.FCM_SERVER_KEY;
  const tokens = getFcmTokens();
  if (!serverKey) return { ok: false, error: 'FCM_SERVER_KEY not set' };
  if (!tokens.length) return { ok: false, error: 'No devices registered' };

  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: { title, body, sound: 'default', priority: 'high' },
        data: { click_action: 'OPEN_APP', ...data },
        priority: 'high',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `FCM responded ${res.status}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/** The id of the most recent INBOX message we already alerted about. */
export function getLastPushedInboxId(): string | null {
  return getSetting('last_pushed_inbox_id') || null;
}

export function setLastPushedInboxId(id: string): void {
  setSetting('last_pushed_inbox_id', id);
}
