'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Mail, ListChecks, FileText,
  Plug, Settings, Menu, X, Sun, Leaf
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns', icon: Mail },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/lists', label: 'Email Lists', icon: ListChecks },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-green-700 text-white flex items-center justify-between px-4 py-3 safe-top shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
            <Sun className="w-5 h-5 text-green-800" />
          </div>
          <span className="font-bold text-lg">Leaf Solar</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 hover:bg-green-600 rounded-lg">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-green-800 to-green-900 text-white z-50
        transform transition-transform duration-300 safe-top
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg">
              <Sun className="w-7 h-7 text-green-800" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-tight">Leaf Solar</h1>
              <p className="text-green-300 text-xs flex items-center gap-1">
                <Leaf className="w-3 h-3" /> Mailer Pro
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map(item => {
              const active = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${active
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-green-100 hover:bg-white/10'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <a
            href="https://www.leafsolar.ng"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-green-300 hover:text-white transition-colors"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            www.leafsolar.ng
          </a>
        </div>
      </aside>
    </>
  );
}
