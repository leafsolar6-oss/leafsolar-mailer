import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for building a native Android APK.
 *
 * server.url loads the hosted app DIRECTLY in the WebView — the app opens
 * straight to the login page with no intermediate loading shell. This is the
 * most reliable setup now that the site (with its login page) is live on
 * Vercel: the user sees the login page immediately.
 *
 * If the network fails, Android shows its own informative error page in the
 * WebView (rather than a silent green screen).
 *
 * The URL defaults to https://mailer.leafsolar.ng (the same Vercel deployment
 * as leafsolar-mailer.vercel.app, but reachable from more networks). Override
 * with the APP_URL env var.
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
      launchShowDuration: 1500,
      backgroundColor: '#16a34a',
      showSpinner: false,
      autoHide: true,
    },
  },
};

export default config;
