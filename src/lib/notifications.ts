/**
 * Device notifications via @capacitor/local-notifications.
 *
 * Shows real Android system notifications (they pop up even when the phone
 * is locked, idle, or you're in another app). This layer works immediately
 * without any account. TRUE closed-app push (FCM) is documented in the README
 * and needs a Firebase project + google-services.json — once added, we plug
 * in @capacitor/push-notifications on top of this same permission/channel.
 *
 * Guards every call so the web build (and browsers) are unaffected.
 */
import type { LocalNotificationSchema } from '@capacitor/local-notifications';

type LocalNotificationsApi = typeof import('@capacitor/local-notifications').LocalNotifications;

let cached: LocalNotificationsApi | null | undefined;

async function api(): Promise<LocalNotificationsApi | null> {
  if (cached !== undefined) return cached;
  try {
    if (typeof window === 'undefined') return (cached = null);
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) {
      return (cached = null); // browser — no local notifications
    }
    const mod = await import('@capacitor/local-notifications');
    cached = mod.LocalNotifications;
    return cached;
  } catch {
    return (cached = null);
  }
}

function enabled(): boolean {
  try { return localStorage.getItem('ls_notifications') !== 'off'; } catch { return true; }
}

export function setNotificationsEnabled(on: boolean): void {
  try { localStorage.setItem('ls_notifications', on ? 'on' : 'off'); } catch { /* ignore */ }
}

async function ensureChannel(a: LocalNotificationsApi): Promise<void> {
  try {
    await a.createChannel({
      id: 'default',
      name: 'Notifications',
      description: 'Leaf Solar Mailer alerts',
      importance: 5, // IMPORTANCE_HIGH
      visibility: 1, // public
      sound: 'notificationsound.wav',
      vibration: true,
    });
  } catch {
    /* older Android — default channel is fine */
  }
}

/** Requests the system notification permission (Android 13+ shows a dialog).
 *  Call from a user gesture. Returns true if allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  const a = await api();
  if (!a) return false;
  try {
    await ensureChannel(a);
    const perm = await a.requestPermissions();
    return perm.display === 'granted';
  } catch {
    // On some versions requestPermissions isn't supported — assume granted.
    return true;
  }
}

/** True when notifications are enabled AND permission granted. */
export async function canNotify(): Promise<boolean> {
  if (!enabled()) return false;
  const a = await api();
  if (!a) return false;
  try {
    const perm = await a.checkPermissions();
    return perm.display === 'granted' || perm.display === 'prompt';
  } catch {
    return false;
  }
}

async function schedule(title: string, body: string, opts: { id?: number } = {}): Promise<void> {
  if (!enabled()) return;
  const a = await api();
  if (!a) return;
  try {
    const perm = await a.checkPermissions();
    if (perm.display !== 'granted') return;
    await ensureChannel(a);
    const notification: LocalNotificationSchema = {
      id: opts.id ?? Math.floor(Math.random() * 1_000_000),
      title,
      body,
      schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true },
      channelId: 'default',
      smallIcon: 'ic_launcher',
    };
    await a.schedule({ notifications: [notification] });
  } catch {
    /* notifications unavailable */
  }
}

/** A new email arrived. */
export async function notifyNewEmail(sender: string, subject: string): Promise<void> {
  await schedule(`📥 New email from ${sender}`, subject || 'You have a new message');
}

/** An email was sent successfully. */
export async function notifySent(subject: string): Promise<void> {
  await schedule('✅ Email sent', subject || 'Your email was sent successfully');
}

/** A campaign finished. */
export async function notifyCampaignDone(name: string, sent: number, failed: number): Promise<void> {
  await schedule(`📬 Campaign finished: ${name}`, `${sent} sent · ${failed} failed`);
}

/** Generic info notification. */
export async function notifyInfo(title: string, body: string): Promise<void> {
  await schedule(title, body);
}
