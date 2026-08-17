import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import BackButtonHandler from '@/components/BackButtonHandler';
import NotificationPoller from '@/components/NotificationPoller';
import NotificationsManager from '@/components/NotificationsManager';
import PWARegister from '@/components/PWARegister';
import InstallPrompt from '@/components/InstallPrompt';
import SchedulerPoller from '@/components/SchedulerPoller';

export const metadata: Metadata = {
  title: 'Leaf Solar Mailer — Bulk Email Marketing',
  description: 'Send bulk campaigns, manage leads, and grow your solar business with Leaf Solar Mailer.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Leaf Solar',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <PWARegister />
        <SchedulerPoller />
        <BackButtonHandler />
        <NotificationsManager />
        <NotificationPoller />
        <AppShell>{children}</AppShell>
        <Toaster position="top-center" toastOptions={{
          duration: 3200,
          style: {
            background: '#0f172a',
            color: '#fff',
            borderRadius: '14px',
            fontSize: '14px',
            padding: '12px 18px',
            maxWidth: '90vw',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }} />
        <InstallPrompt />
      </body>
    </html>
  );
}
