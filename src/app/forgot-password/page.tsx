'use client';
import { Suspense, useState } from 'react';
import { Link2, Mail, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

function ForgotContent() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ message: string; directLink?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Enter your admin email');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'Something went wrong');
      setResult({ message: data.message, directLink: data.directLink });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-8 shadow-2xl animate-fade-in">
        <Link href="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          <Link2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Forgot your password?</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter the admin email for this workspace. If it matches, we'll send you a reset link.
        </p>

        {!result ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" /> Admin email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@leafsolar.ng" className="input" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3 disabled:opacity-60">
              {busy ? <div className="spinner !w-5 !h-5" /> : 'Send reset link'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-900">{result.message}</p>
            </div>
            {result.directLink && (
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    No email server is configured, so here's your reset link. Anyone with this link can
                    reset the password — treat it like a secret.
                  </p>
                </div>
                <a href={result.directLink}
                  className="block w-full text-center btn btn-primary !py-3">
                  Open reset link
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
      <ForgotContent />
    </Suspense>
  );
}
