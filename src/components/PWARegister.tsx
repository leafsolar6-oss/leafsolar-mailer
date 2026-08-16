'use client';
import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        // Auto-update: when a new service worker is found, activate it right
        // away so users get updates without waiting for the next session.
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage?.({ type: 'SKIP_WAITING' });
            }
          });
        });
      } catch {
        // Service worker registration failed - app still works without it.
      }
    };

    register();
  }, []);

  return null;
}
