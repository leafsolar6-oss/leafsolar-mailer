'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Android native back button = "back" inside the app (never closes it).
 *
 * Behavior:
 *  - If there's in-app history, go back like the browser back arrow.
 *  - If you're on a page deeper than the dashboard with no history, go to the
 *    dashboard instead of exiting.
 *  - If you're already on the dashboard root, minimize (background) the app
 *    rather than force-closing it — the standard Android app behavior.
 *
 * Only active inside the Capacitor WebView (guarded with Capacitor's native
 * platform check); in a normal browser this component does nothing.
 */
export default function BackButtonHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const stack = useRef<string[]>([]);

  // Track visited paths (client-side) so we always know whether "back" is
  // possible, independent of the WebView's own history (which can be lost
  // when the app loads via a redirect, e.g. / -> /login).
  useEffect(() => {
    const s = stack.current;
    const last = s[s.length - 1];
    if (last !== pathname) {
      s.push(pathname);
      if (s.length > 100) s.shift();
    }
  }, [pathname]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      if (typeof window === 'undefined') return;
      // Only on native (Capacitor) platforms — no-op in a browser.
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;

      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('backButton', async () => {
          const s = stack.current;

          // 1) In-app history exists -> navigate back.
          if (s.length > 1) {
            s.pop(); // drop the current page
            // Loop guard: if the previous entry equals the current path, pop again.
            if (s[s.length - 1] === pathname) s.pop();
            router.back();
            return;
          }

          // 2) No history, but not on the dashboard -> go to the dashboard.
          if (pathname !== '/') {
            router.replace('/');
            return;
          }

          // 3) On the dashboard root -> background the app (don't force-close).
          try {
            await App.minimizeApp();
          } catch {
            /* iOS/unsupported — ignore */
          }
        });
        cleanup = () => { listener.remove(); };
      } catch {
        /* @capacitor/app unavailable — fall back to default behavior */
      }
    })();

    return () => { cleanup?.(); };
  }, [pathname, router]);

  return null;
}
