'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, LogIn } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(h => {
      if (h && h.storage && !h.storage.durable) {
        setStorageWarning('Durable storage is not connected — accounts & data can reset on server restarts. Configure Upstash Redis (or Supabase) in Vercel, then redeploy.');
      }
    }).catch(() => {});
    fetch('/api/auth/setup').then(r => r.json()).then(d => {
      if (!d.configured) {
        setShowSetup(true);
        router.replace('/welcome');
        return;
      }
      // Already logged in? Skip login.
      fetch('/api/auth/status').then(r => r.json()).then(s => {
        if (s.authenticated) router.replace(searchParams.get('next') || '/');
      }).catch(() => {}).finally(() => setChecking(false));
    }).catch(() => setChecking(false));
  }, [router, searchParams]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) return toast.error('Enter your email and password');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return toast.error(data.error || 'Login failed');
    toast.success('Welcome back!');
    router.replace(searchParams.get('next') || '/');
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-2xl animate-fade-in">
          {storageWarning && (
            <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed animate-fade-in">
              ⚠️ <strong>{storageWarning}</strong>
            </div>
          )}
          <div className="flex items-center gap-3 mb-8">
            <Logo size={48} />
            <div>
              <p className="text-xl font-extrabold text-gray-900">Leaf Solar Mailer</p>
              <p className="text-xs text-emerald-700 font-semibold">Sign in to continue</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" /> Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@leafsolar.ng" className="input" autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-gray-400" /> Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your password" className="input" autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading}
              className="btn btn-primary w-full !py-3 disabled:opacity-60">
              {loading ? <div className="spinner !w-5 !h-5" /> : <><LogIn className="w-5 h-5" /> Sign in</>}
            </button>
          </form>

          <p className="text-center mt-5">
            <Link href="/forgot-password" className="text-sm font-semibold text-emerald-600 hover:underline">
              Forgot your password?
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            Protected workspace · © {new Date().getFullYear()} Leaf Solar
          </p>
        </div>
      </div>
    </div>
  );
}

function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="relative rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20"
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #10b981 100%)' }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4.5" fill="white" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
          <line key={a} x1="12" y1="2" x2="12" y2="4.5" stroke="white" strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${a} 12 12)`} />
        ))}
      </svg>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
