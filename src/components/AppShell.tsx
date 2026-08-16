'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

// Auth/standalone pages get a full-screen layout with NO app sidebar/chrome.
const NO_CHROME = ['/login', '/forgot-password', '/reset-password', '/unsubscribe'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const standalone = NO_CHROME.some(p => pathname === p || pathname.startsWith(`${p}/`));

  if (standalone) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-[286px] safe-top safe-bottom">
        <div className="p-4 lg:p-10 max-w-7xl mx-auto pb-28 lg:pb-10 pt-20 lg:pt-10">
          {children}
        </div>
      </main>
    </div>
  );
}
