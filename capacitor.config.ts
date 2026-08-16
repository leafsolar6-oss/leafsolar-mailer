import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for building a native Android APK.
 *
 * The APK loads a small bundled shell (www/index.html) that probes the hosted
 * app and then navigates to it. Why not `server.url`? With server.url the
 * WebView loads the remote site directly and any failure (offline, DNS, TLS,
 * WebView issue) shows a silent blank green screen. The shell gives a clear
 * loading state, auto-redirect, and a helpful error + retry when the app
 * can't be reached.
 *
 * The app URL is baked into www/index.html at build time by
 * `scripts/bake-app-url.mjs` (APP_URL env), used by the CI workflow and
 * `npm run build:android`.
 */
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
    // CRITICAL: the bundled shell navigates the WebView to the hosted app
    // (window.location.replace). Without allowNavigation, Capacitor's
    // WebViewClient blocks navigation to hosts not listed here and the app
    // sits on the loading screen forever. List every host the app may load.
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
      showSpinner: true,
      spinnerColor: '#ffffff',
      autoHide: true,
    },
  },
};

export default config;
