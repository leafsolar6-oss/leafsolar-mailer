'use client';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { playIncomingSound, unlockAudio } from '@/lib/sounds';
import { notifyNewEmail } from '@/lib/notifications';

const POLL_MS = 45000; // every 45s
const LAST_ID_KEY = 'ls_last_inbox_id';

/**
 * Global notification + sync monitor:
 *  - Unlocks audio on first interaction (autoplay policy).
 *  - Polls the inbox; when a NEW unread message appears, plays the incoming
 *    chime, flashes a toast + title.
 *  - Registers the service-worker background sync ('outbox-flush') so queued
 *    writes flush when connectivity returns, even if the app is backgrounded.
 *  - Re-checks the inbox whenever the app comes back online.
 */
export default function NotificationPoller() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    let timer: ReturnType<typeof setInterval> | null = null;

    const checkInbox = async () => {
      try {
        const statusRes = await fetch('/api/inbox?action=status', { cache: 'no-store' });
        if (!statusRes.ok) return;
        const status = await statusRes.json();
        if (!status.configured) return;

        const res = await fetch('/api/inbox?folder=INBOX&limit=6', { cache: 'no-store' });
        if (!res.ok) return;
        const msgs = await res.json();
        if (!Array.isArray(msgs) || msgs.length === 0) return;

        const latest = msgs[0];
        const lastId = localStorage.getItem(LAST_ID_KEY);
        // Only notify when we already had a baseline AND the newest changed
        // AND it's unread.
        if (lastId && latest.id !== lastId && !latest.seen) {
          const sender = latest.from_name || latest.from || 'someone';
          playIncomingSound();
          // Real system notification — pops up even if the phone is locked or
          // you're in another app (when the app process can run).
          void notifyNewEmail(sender, latest.subject || '');
          toast.success(`📥 New email from ${sender}`, { duration: 5000 });
          document.title = '📥 New email — Leaf Solar Mailer';
          setTimeout(() => {
            document.title = 'Leaf Solar Mailer — Bulk Email Marketing';
          }, 4000);
        }
        localStorage.setItem(LAST_ID_KEY, latest.id);
      } catch {
        /* offline — silent */
      }
    };

    const registerBackgroundSync = async () => {
      try {
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.ready as unknown as {
          sync?: { register: (tag: string) => Promise<void> };
          periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
        };
        if (reg.sync) await reg.sync.register('outbox-flush');
        // Periodic background sync (best-effort; needs permission on some builds).
        if (reg.periodicSync) {
          try {
            await reg.periodicSync.register('outbox-flush', { minInterval: 60 * 60 * 1000 });
          } catch { /* not permitted — fine */ }
        }
      } catch { /* SW unavailable */ }
    };

    // Unlock audio as soon as the user has interacted at least once (even
    // without any sound playing, this satisfies autoplay policy).
    checkInbox();
    timer = setInterval(checkInbox, POLL_MS);
    registerBackgroundSync();

    const onOnline = () => { checkInbox(); };
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('online', onOnline);
      if (timer) clearInterval(timer);
    };
  }, []);

  return null;
}
