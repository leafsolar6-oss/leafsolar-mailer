'use client';
import { useEffect, useState } from 'react';
import {
  Mail, Send, CheckCircle2, AlertCircle, Info, Smartphone, ShieldCheck,
  KeyRound, LogOut, User, Volume2, BellRing,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { SMTPSettings } from '@/types';
import { offlineFetch } from '@/lib/offline';
import { setSoundsEnabled, unlockAudio } from '@/lib/sounds';
import { setNotificationsEnabled, requestNotificationPermission, registerPushToken } from '@/lib/notifications';

const PRESETS = [
  { name: 'Truehost / Cloudoon (your hosting)', host: 'mail.leafsolar.ng', port: 587, secure: false },
  { name: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, secure: false },
  { name: 'Outlook / Office 365', host: 'smtp.office365.com', port: 587, secure: false },
  { name: 'Brevo', host: 'smtp-relay.brevo.com', port: 587, secure: false },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false },
  { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false },
  { name: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, secure: true },
  { name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', port: 587, secure: false },
  { name: 'Custom', host: '', port: 587, secure: false },
];

export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<{ email: string } | null>(null);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [soundsOn, setSoundsOn] = useState(true);
  const [notifOn, setNotifOn] = useState(true);
  const [permState, setPermState] = useState<string>('unknown');
  const [s, setS] = useState<SMTPSettings>({
    host: 'mail.leafsolar.ng', port: 587, secure: false, user: '', pass: '',
    from_name: 'Leaf Solar', from_email: '',
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg?: string } | null>(null);

  useEffect(() => {
    offlineFetch<SMTPSettings | null>('/api/settings')
      .then(r => { if (r.data) setS(prev => ({ ...prev, ...r.data })); })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch('/api/auth/status').then(r => r.json()).then(d => {
      if (d.email) setAccount({ email: d.email });
    }).catch(() => {});
  }, []);

  const changePassword = async () => {
    if (pw.next.length < 6) return toast.error('New password must be at least 6 characters');
    if (pw.next !== pw.confirm) return toast.error('New passwords do not match');
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_password', current_password: pw.current, new_password: pw.next }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'Failed');
    toast.success('Password updated');
    setPw({ current: '', next: '', confirm: '' });
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  useEffect(() => {
    try { setSoundsOn(localStorage.getItem('ls_sounds') !== 'off'); } catch { /* ignore */ }
    try { setNotifOn(localStorage.getItem('ls_notifications') !== 'off'); } catch { /* ignore */ }
    // reflect current system permission
    import('@capacitor/local-notifications').then(m => m.LocalNotifications.checkPermissions())
      .then(p => setPermState(p.display)).catch(() => setPermState('unsupported'));
  }, []);

  const toggleNotifs = (on: boolean) => {
    setNotifOn(on);
    setNotificationsEnabled(on);
  };

  const allowNotifs = async () => {
    const ok = await requestNotificationPermission();
    if (ok) {
      setPermState('granted');
      registerPushToken().catch(() => {});
      toast.success('Notifications enabled');
    }
    else toast.error('Notification permission was denied — enable it in system Settings');
  };

  const toggleSounds = (on: boolean) => {
    setSoundsOn(on);
    setSoundsEnabled(on);
    unlockAudio();
  };

  const applyPreset = (name: string) => {
    const p = PRESETS.find(x => x.name === name);
    if (p && p.host) setS(prev => ({ ...prev, host: p.host, port: p.port, secure: p.secure }));
  };

  const save = async () => {
    if (!s.host || !s.user || !s.pass) return toast.error('Host, username, and password are required');
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s),
    });
    setSaving(false);
    toast.success('SMTP settings saved');
  };

  const test = async () => {
    setTesting(true); setResult(null);
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...s, action: 'test' }),
    });
    const data = await res.json();
    setTesting(false);
    setResult({ ok: !!data.success, msg: data.success ? 'Connection successful! Emails will send.' : (data.error || 'Connection failed') });
    if (data.success) toast.success('SMTP connection works!');
    else toast.error(data.error || 'Failed');
  };

  if (loading) return <div className="flex justify-center py-16"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Configure how emails are sent from your app</p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">SMTP Email Server</h2>
            <p className="text-sm text-gray-500">Your hosting email is pre-configured for Truehost/Cloudoon</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">Recommended: Use your Truehost mailbox</p>
              <p className="text-emerald-700 mt-0.5">
                Host is already set to <code className="bg-white/60 px-1.5 py-0.5 rounded">mail.leafsolar.ng</code>.
                Just enter your full email address (e.g. <code className="bg-white/60 px-1.5 py-0.5 rounded">info@leafsolar.ng</code>) and the password you use to log into webmail.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quick Setup</label>
            <select onChange={e => applyPreset(e.target.value)} defaultValue="Truehost / Cloudoon (your hosting)"
              className="input bg-white">
              {PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP Host</label>
              <input value={s.host} onChange={e => setS({ ...s, host: e.target.value })}
                placeholder="mail.leafsolar.ng" className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Port</label>
              <input type="number" value={s.port}
                onChange={e => setS({ ...s, port: parseInt(e.target.value) || 587 })} className="input" />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={s.secure}
              onChange={e => setS({ ...s, secure: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm text-gray-700">Use SSL/TLS (usually port 465). Leave unchecked for STARTTLS (port 587).</span>
          </label>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address (Username)</label>
            <input value={s.user} onChange={e => setS({ ...s, user: e.target.value, from_email: s.from_email || e.target.value })}
              placeholder="info@leafsolar.ng" type="email" className="input" />
            <p className="text-xs text-gray-400 mt-1">This is the full email you created in cPanel/webmail</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <input type="password" value={s.pass} onChange={e => setS({ ...s, pass: e.target.value })}
              placeholder="Your email account password" className="input" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">From Name</label>
              <input value={s.from_name} onChange={e => setS({ ...s, from_name: e.target.value })}
                placeholder="Leaf Solar" className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">From Email</label>
              <input value={s.from_email} onChange={e => setS({ ...s, from_email: e.target.value })}
                placeholder="info@leafsolar.ng" type="email" className="input" />
            </div>
          </div>

          {result && (
            <div className={`p-3.5 rounded-xl flex items-start gap-2.5 text-sm ${
              result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {result.ok ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{result.msg}</span>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button onClick={test} disabled={testing}
              className="btn btn-secondary">
              {testing ? <div className="spinner !w-4 !h-4" /> : <Send className="w-4 h-4" />}
              Test Connection
            </button>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" /> Where to find your email password
        </h3>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Log in to your <strong>Truehost/cPanel</strong> account</li>
          <li>Go to <strong>Email Accounts</strong> → find or create <code>info@leafsolar.ng</code></li>
          <li>Click <strong>Connect Devices</strong> or <strong>Manage</strong> to see the password, or set a new one</li>
          <li>Paste that email and password on this page, then tap <strong>Test Connection</strong></li>
        </ol>
        <p className="text-xs text-gray-400 mt-3">
          💡 For better deliverability when sending bulk email, consider using a dedicated service like Brevo (300 free emails/day) — select it from Quick Setup and paste their SMTP key.
        </p>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-600" /> Android App
        </h3>
        <p className="text-sm text-gray-600">
          The app loads from <strong>https://mailer.leafsolar.ng</strong>. Settings saved here apply to both the website and the APK. If you change SMTP later, no reinstall is needed.
        </p>
      </div>

      {/* Account & security */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Account & Security</h2>
            <p className="text-sm text-gray-500">Your admin login and password</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{account?.email || 'Admin account'}</p>
              <p className="text-xs text-gray-500">Sign-in email for this workspace</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Current password</label>
              <input type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">New password</label>
              <input type="password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
              <input type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} className="input text-sm" />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={changePassword} className="btn btn-primary">
              <KeyRound className="w-4 h-4" /> Update Password
            </button>
            <button onClick={logout} className="btn btn-secondary text-red-600">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Notification Sounds */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Notification Sounds</h2>
            <p className="text-sm text-gray-500">Chime when a new email arrives, blip when an email is sent</p>
          </div>
        </div>
        <div className="p-5">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Play sounds</p>
              <p className="text-xs text-gray-500 mt-0.5">Incoming mail & sent-email notifications</p>
            </div>
            <button onClick={() => toggleSounds(!soundsOn)}
              className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${soundsOn ? 'bg-emerald-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${soundsOn ? 'left-6' : 'left-1'}`} />
            </button>
          </label>
        </div>
      </div>

      {/* Device notifications */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
            <BellRing className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Device Notifications</h2>
            <p className="text-sm text-gray-500">Pop-up alerts for new mail & activity — even when the phone is locked or you're in another app</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Show notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">New emails, sent emails, campaign results</p>
            </div>
            <button onClick={() => toggleNotifs(!notifOn)}
              className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${notifOn ? 'bg-emerald-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${notifOn ? 'left-6' : 'left-1'}`} />
            </button>
          </label>
          {notifOn && permState !== 'granted' && (
            <div className="flex items-center justify-between gap-3 p-3.5 bg-blue-50 rounded-2xl">
              <p className="text-xs text-blue-800">
                {permState === 'denied'
                  ? 'Permission was denied. Enable it in Android Settings → Apps → Leaf Solar Mailer → Notifications.'
                  : 'Allow notifications to get alerts even when the app is closed or the phone is locked.'}
              </p>
              <button onClick={allowNotifs} className="btn btn-primary !py-2 !px-3 text-xs whitespace-nowrap">Allow</button>
            </div>
          )}
          <p className="text-xs text-gray-400">
            For alerts when the app is fully closed, we recommend the optional Firebase push setup (see README).
          </p>
        </div>
      </div>
    </div>
  );
}
