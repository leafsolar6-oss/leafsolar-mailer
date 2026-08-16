import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for building a native Android APK.
 *
 * The APK bundles a small shell (www/index.html) that:
 *   - probes the hosted app, and when reachable immediately navigates the
 *     WebView to it — the login page appears first, exactly as expected;
 *   - if the phone can't reach the server (wrong date/time, network, DNS),
 *     shows a clear branded screen with Retry / Open in browser / hints,
 *     instead of Android's bare "webpage not available".
 *
 * allowNavigation lists the hosts the shell may navigate to. The URL is
 * baked into www/index.html at build time by scripts/bake-app-url.mjs
 * (APP_URL env; default https://mailer.leafsolar.ng).
 */
const appUrl = process.env.APP_URL || 'https://mailer.leafsolar.ng';

const config: CapacitorConfig = {
  appId: 'ng.leafsolar.mailer',
  appName: 'Leaf Solar Mailer',
  webDir: 'www',
  backgroundColor: '#f0fdf4',
  android: {
    allowMixedContent: false,
    backgroundColor: '#16a34a',
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'mailer.leafsolar.ng',
      'www.leafsolar.ng',
      'leafsolar-mailer.vercel.app',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#16a34a',
      showSpinner: false,
      autoHide: true,
    },
  },
};

export default config;
