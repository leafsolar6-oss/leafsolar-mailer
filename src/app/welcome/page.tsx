'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldCheck, Sparkles, ServerCog, CalendarClock, BarChart3, CloudUpload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WelcomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [smtpOpen, setSmtpOpen] = useState(false);
  const [smtp, setSmtp] = useState({ host: 'mail.leafsolar.ng', port: '587', secure: false, user: '', pass: '', from_name: 'Leaf Solar', from_email: '' });
  const [loading, setLoading] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(h => {
      if (h && h.storage && !h.storage.durable) {
        setStorageWarning('Durable storage is not connected — accounts & data can reset on server restarts. Configure Upstash Redis (or Supabase) in Vercel, then redeploy.');
      }
    }).catch(() => {});
    fetch('/api/auth/setup').then(r => r.json()).then(d => {
      if (d.configured) router.replace('/login');
    }).catch(() => {});
  }, [router]);

  const submit = async () => {
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    const res = await fetch('/api/auth/setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password, confirm,
        smtp_host: smtpOpen ? smtp.host : '', smtp_port: smtpOpen ? smtp.port : '',
        smtp_user: smtpOpen ? smtp.user : '', smtp_pass: smtpOpen ? smtp.pass : '',
        smtp_from_name: smtpOpen ? smtp.from_name : '', smtp_from_email: smtpOpen ? smtp.from_email : '',
        smtp_secure: smtpOpen ? smtp.secure : false,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return toast.error(data.error);
    toast.success('Welcome aboard! Your workspace is ready.');
    router.replace('/');
  };

  const features = [
    { icon: CalendarClock, title: 'Campaign scheduling', desc: 'Auto-send campaigns at the perfect time.' },
    { icon: BarChart3, title: 'Open & click analytics', desc: 'Know exactly who engaged with every send.' },
    { icon: ServerCog, title: '16+ integrations', desc: 'Pull leads from Facebook, TikTok, Mailchimp & more.' },
    { icon: CloudUpload, title: 'Backups & cloud sync', desc: 'Every contact and campaign backed up safely.' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: branding */}
        <div className="hidden lg:block animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <Logo size={52} />
            <div>
              <p className="text-2xl font-extrabold text-gray-900">Leaf Solar Mailer</p>
              <p className="text-sm text-emerald-700 font-semibold">Bulk email marketing, powered for growth</p>
            </div>
          </div>
          <p className="text-gray-600 text-lg leading-relaxed mb-8">
            Welcome! Set up your admin account to unlock your marketing workspace — campaigns,
            contacts, lists, templates and integrations in one place.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card p-4 flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{f.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: setup form */}
        <div className="card p-8 animate-fade-in shadow-2xl">
          {storageWarning && (
            <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed animate-fade-in">
              ⚠️ <strong>{storageWarning}</strong>
            </div>
          )}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <Logo size={44} />
            <div>
              <p className="text-xl font-extrabold text-gray-900">Leaf Solar Mailer</p>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" /> Create your admin account
          </h1>
          <p className="text-gray-500 text-sm mt-1 mb-6">This is the first step — only you will have access.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" /> Admin email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@leafsolar.ng" className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-gray-400" /> Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters" className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-gray-400" /> Confirm password
              </label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password" className="input" />
            </div>

            <button onClick={() => setSmtpOpen(!smtpOpen)}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5">
              <ServerCog className="w-4 h-4" /> Optional: configure SMTP now {smtpOpen ? '−' : '+'}
            </button>

            {smtpOpen && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SMTP host</label>
                    <input value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} className="input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Port</label>
                    <input value={smtp.port} onChange={e => setSmtp({ ...smtp, port: e.target.value })} className="input text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">SMTP user (email)</label>
                  <input value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Password</label>
                  <input type="password" value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })} className="input text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From name</label>
                    <input value={smtp.from_name} onChange={e => setSmtp({ ...smtp, from_name: e.target.value })} className="input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From email</label>
                    <input value={smtp.from_email} onChange={e => setSmtp({ ...smtp, from_email: e.target.value })} className="input text-sm" />
                  </div>
                </div>
              </div>
            )}

            <button onClick={submit} disabled={loading}
              className="btn btn-primary w-full !py-3.5 !text-base disabled:opacity-60">
              {loading ? <div className="spinner !w-5 !h-5" /> : <><Sparkles className="w-5 h-5" /> Set up my workspace</>}
            </button>
          </div>
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
