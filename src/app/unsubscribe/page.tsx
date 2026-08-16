'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, MailX, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<'loading' | 'confirm' | 'done' | 'error'>('loading');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) { setState('error'); return; }
    fetch(`/api/unsubscribe?id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.email) { setEmail(d.email); setName(d.name || ''); setState('confirm'); }
        else setState('error');
      })
      .catch(() => setState('error'));
  }, [searchParams]);

  const confirmUnsub = async () => {
    setBusy(true);
    const res = await fetch('/api/unsubscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(data.error || 'Something went wrong');
    setState('done');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-8 text-center shadow-2xl animate-fade-in">
        {state === 'loading' && <div className="py-12"><div className="spinner mx-auto" /></div>}

        {state === 'confirm' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <MailX className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Unsubscribe from Leaf Solar emails?</h1>
            <p className="text-gray-500 text-sm mb-1">
              {name ? `Hi ${name}, ` : ''}we'll stop sending marketing emails to:
            </p>
            <p className="font-bold text-gray-900 mb-6">{email}</p>
            <div className="space-y-2">
              <button onClick={confirmUnsub} disabled={busy}
                className="btn w-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                {busy ? <div className="spinner !w-5 !h-5" /> : 'Yes, unsubscribe me'}
              </button>
              <button onClick={() => window.location.href = 'https://www.leafsolar.ng'}
                className="btn btn-secondary w-full">
                No, keep me subscribed
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> We'll keep a record so we don't email you again.
            </p>
          </>
        )}

        {state === 'done' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">You're unsubscribed</h1>
            <p className="text-gray-500 text-sm mb-6">
              <span className="font-semibold">{email}</span> has been removed from our marketing list.
              You won't receive campaign emails from us again.
            </p>
            <a href="https://www.leafsolar.ng" className="btn btn-primary w-full">Back to leafsolar.ng</a>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">Link not recognised</h1>
            <p className="text-gray-500 text-sm mb-6">
              This unsubscribe link isn't valid. If you'd like to stop receiving emails, reply to any
              message from us and we'll remove you manually.
            </p>
            <a href="https://www.leafsolar.ng" className="btn btn-primary w-full">Visit leafsolar.ng</a>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
