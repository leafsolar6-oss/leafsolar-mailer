'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

function ResetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) toast.error('Missing reset token — use the link from your email.');
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirm }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'Reset failed');
      setDone(true);
      toast.success('Password updated — welcome back!');
      setTimeout(() => router.replace('/'), 1200);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md card p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Password updated 🎉</h1>
          <p className="text-gray-500 text-sm mb-6">You're signed in. Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-8 shadow-2xl animate-fade-in">
        <Link href="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          <KeyRound className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Set a new password</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a strong password for your admin account.</p>

        {!token ? (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-2xl p-4">
            This link is missing its token. Go back to <Link href="/forgot-password" className="underline font-semibold">Forgot password</Link> and request a fresh link.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters" className="input" autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm new password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password" className="input" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3 disabled:opacity-60">
              {busy ? <div className="spinner !w-5 !h-5" /> : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
      <ResetContent />
    </Suspense>
  );
}
