import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for building a native Android APK.
 *
 * server.url loads the hosted app DIRECTLY in the WebView — the app opens
 * straight to the login page with no intermediate shell. This is deliberate:
 * an earlier version used a bundled shell that probed the server and then
 * navigated to it; on flaky networks the failed navigation bounced back to
 * the shell and retried forever (non-stop reload). With server.url there is
 * no shell to bounce to, so no reload loop.
 *
 * Offline works via the app's own service worker: after the first successful
 * load, the site caches its pages + data, so subsequent launches (even
 * offline) come from cache — Gmail-style. Only sending and receiving need
 * internet (writes queue and flush via background sync).
 *
 * URL defaults to https://mailer.leafsolar.ng; override with APP_URL env.
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
    url: appUrl,
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

