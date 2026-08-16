import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for building a native Android APK.
 *
 * The app uses a server-side SQLite database and API routes, so the APK
 * loads the hosted web app from APP_URL rather than bundling static files.
 * This gives you a real installable APK that talks to your live backend.
 *
 * Set APP_URL in your environment (or .env) to your deployed URL, e.g.:
 *   APP_URL=https://leafsolar-mailer.vercel.app
 *
 * Then run:
 *   npm run build:android
 *   npx cap sync android
 *   npx cap open android      (Build > Build APK in Android Studio)
 */
const appUrl = process.env.APP_URL || 'https://leafsolar-mailer.vercel.app';

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
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#16a34a',
      showSpinner: false,
    },
  },
};

export default config;
