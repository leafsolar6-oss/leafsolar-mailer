import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import PWARegister from '@/components/PWARegister';
import { DashboardsProvider } from '@/components/DashboardProvider';

export const metadata: Metadata = {
  title: 'Leaf Solar Mailer - Bulk Email Marketing',
  description: 'Send bulk email campaigns, manage leads, and grow your solar business with Leaf Solar Mailer.',
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
  themeColor: '#16a34a',
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <PWARegister />
        <DashboardsProvider>
          <div className="flex min-h-screen bg-green-50">
            <Sidebar />
            <main className="flex-1 lg:ml-64 safe-top safe-bottom">
              <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
                {children}
              </div>
            </main>
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1f2937',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '14px',
                maxWidth: '90vw',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </DashboardsProvider>
      </body>
    </html>
  );
}
