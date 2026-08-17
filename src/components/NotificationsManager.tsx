'use client';
import { useEffect } from 'react';
import { requestNotificationPermission } from '@/lib/notifications';

const PERMISSION_ASKED_KEY = 'ls_notif_asked';

/**
 * Requests the Android notification permission on the first user interaction
 * (Android 13+ requires a user gesture to show the system dialog). Also sets
 * up the notification channel. Only active on native (Capacitor) builds.
 */
export default function NotificationsManager() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;

    let asked = false;
    try { asked = localStorage.getItem(PERMISSION_ASKED_KEY) === '1'; } catch { /* ignore */ }

    const ask = () => {
      if (asked) return;
      asked = true;
      try { localStorage.setItem(PERMISSION_ASKED_KEY, '1'); } catch { /* ignore */ }
      requestNotificationPermission().catch(() => {});
    };

    // First interaction (tap/key) — best moment to ask.
    window.addEventListener('pointerdown', ask, { once: true });
    window.addEventListener('keydown', ask, { once: true });

    return () => {
      window.removeEventListener('pointerdown', ask);
      window.removeEventListener('keydown', ask);
    };
  }, []);

  return null;
}
