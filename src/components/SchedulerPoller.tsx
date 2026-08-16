'use client';
import { useEffect } from 'react';

/**
 * Polls the scheduler every 60 seconds while the app is open so that
 * scheduled campaigns send automatically at their due time (the Vercel cron
 * covers it when the app is closed).
 */
export default function SchedulerPoller() {
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch('/api/scheduler', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.processed && data.processed.length > 0) {
          // Optional: surface a subtle notification via title flash.
          document.title = `📬 Sent ${data.sent} — Leaf Solar Mailer`;
          setTimeout(() => { document.title = 'Leaf Solar Mailer — Bulk Email Marketing'; }, 4000);
        }
      } catch {
        /* offline — skip silently */
      }
    };
    tick();
    const interval = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  return null;
}
