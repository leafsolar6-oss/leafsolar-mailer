'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Mail, ListChecks, FileText,
  Plug, Settings, Menu, X, Send, Wifi, WifiOff, Inbox, DatabaseBackup, LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { flushOutbox, outboxCount } from '@/lib/offline';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/compose', label: 'Compose', icon: Send },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/campaigns', label: 'Campaigns', icon: Mail },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/lists', label: 'Lists', icon: ListChecks },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/backups', label: 'Backups', icon: DatabaseBackup },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = async () => {
      setOnline(true);
      const { sent } = await flushOutbox();
      if (sent > 0) {
        outboxCount().then(setPending);
      }
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    outboxCount().then(setPending);
    const i = setInterval(() => outboxCount().then(setPending), 4000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(i);
    };
  }, []);

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <div>
              <p className="font-bold text-[15px] leading-tight">Leaf Solar</p>
              <p className="text-[11px] text-emerald-700 font-medium">Mailer Pro</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <StatusPill online={online} pending={pending} />
            <button onClick={() => setOpen(!open)} className="p-2 rounded-xl hover:bg-black/5">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-[270px] z-50
        transform transition-transform duration-300 safe-top
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-full m-3 lg:m-4 rounded-3xl glass shadow-xl flex flex-col overflow-hidden">
          <div className="p-5 flex items-center gap-3">
            <Logo size={44} />
            <div>
              <p className="font-extrabold text-lg leading-tight">Leaf Solar</p>
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Mailer Pro
              </p>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const active = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className={`
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${active
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-gray-700 hover:bg-black/5'
                    }
                  `}>
                  <Icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3">
            <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium
              ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {online ? (pending > 0 ? `${pending} pending` : 'Online') : 'Offline — changes queued'}
            </div>
            <a href="https://www.leafsolar.ng" target="_blank" rel="noopener noreferrer"
              className="block text-center text-[11px] text-gray-400 mt-2 hover:text-emerald-600">
              www.leafsolar.ng
            </a>
            <button onClick={logout}
              className="w-full mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-red-500 py-1.5 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="relative rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #10b981 100%)',
      }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4.5" fill="white" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
          <line key={a} x1="12" y1="2" x2="12" y2="4.5"
            stroke="white" strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${a} 12 12)`} />
        ))}
      </svg>
    </div>
  );
}

function StatusPill({ online, pending }: { online: boolean; pending: number }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
      ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      <span className={`online-dot ${online ? 'online' : 'offline'}`} />
      {online ? (pending > 0 ? `${pending}` : 'Live') : 'Offline'}
    </div>
  );
}
