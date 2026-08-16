'use client';
import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Mail, Send, CheckCircle, AlertCircle, Info, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import type { SMTPSettings } from '@/types';

const SMTP_PRESETS = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
  { name: 'Outlook/Office365', host: 'smtp.office365.com', port: 587, secure: false },
  { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587, secure: false },
  { name: 'Brevo', host: 'smtp-relay.brevo.com', port: 587, secure: false },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false },
  { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false },
  { name: 'Zoho', host: 'smtp.zoho.com', port: 465, secure: true },
  { name: 'Custom', host: '', port: 587, secure: false },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SMTPSettings>({
    host: '', port: 587, secure: false, user: '', pass: '',
    from_name: 'Leaf Solar', from_email: '',
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data) setSettings(prev => ({ ...prev, ...data }));
      setLoading(false);
    });
  }, []);

  const applyPreset = (presetName: string) => {
    const preset = SMTP_PRESETS.find(p => p.name === presetName);
    if (preset && preset.host) {
      setSettings(prev => ({ ...prev, host: preset.host, port: preset.port, secure: preset.secure }));
    }
  };

  const save = async () => {
    if (!settings.host || !settings.user || !settings.pass) {
      toast.error('Host, username, and password are required');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) toast.success('Settings saved successfully');
    else toast.error('Failed to save settings');
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, action: 'test' }),
    });
    const data = await res.json();
    setTesting(false);
    setTestResult(data);
    if (data.success) toast.success('SMTP connection successful!');
    else toast.error(data.error || 'Connection failed');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in mt-12 lg:mt-0 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500">Configure your email sending and app preferences</p>
      </div>

      {/* SMTP Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">SMTP Email Settings</h2>
            <p className="text-sm text-gray-500">Configure the mail server for sending bulk emails</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Preset selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Setup</label>
            <select onChange={e => applyPreset(e.target.value)} defaultValue=""
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none bg-white">
              <option value="" disabled>Select your email provider...</option>
              {SMTP_PRESETS.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host *</label>
              <input value={settings.host} onChange={e => setSettings({ ...settings, host: e.target.value })}
                placeholder="smtp.example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port *</label>
              <input type="number" value={settings.port} onChange={e => setSettings({ ...settings, port: parseInt(e.target.value) || 587 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.secure}
              onChange={e => setSettings({ ...settings, secure: e.target.checked })}
              className="w-4 h-4 rounded text-green-600 focus:ring-green-500" />
            <span className="text-sm text-gray-700">Use SSL/TLS (port 465)</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input value={settings.user} onChange={e => setSettings({ ...settings, user: e.target.value })}
              placeholder="your@email.com or API username"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password / API Key *</label>
            <input type="password" value={settings.pass} onChange={e => setSettings({ ...settings, pass: e.target.value })}
              placeholder="Your email password or app-specific password"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
              <input value={settings.from_name} onChange={e => setSettings({ ...settings, from_name: e.target.value })}
                placeholder="Leaf Solar"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
              <input value={settings.from_email} onChange={e => setSettings({ ...settings, from_email: e.target.value })}
                placeholder="info@leafsolar.ng" type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
              testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResult.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {testResult.success ? 'SMTP connection verified successfully!' : testResult.error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={test} disabled={testing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 disabled:opacity-50">
              {testing ? <div className="w-5 h-5 spinner" /> : <Send className="w-5 h-5" />}
              Test Connection
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 shadow">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-600" /> Install as Android App (APK)
        </h2>
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 mb-4 flex items-start gap-2">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">This is a PWA (Progressive Web App)</p>
            <p>You can install it directly from Chrome on Android by tapping the menu (⋮) and selecting "Install app". For a standalone APK file, use a PWA-to-APK tool like PWABuilder or Bubblewrap.</p>
          </div>
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Steps to create APK:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Host this app on a server (Vercel, your VPS, etc.) with HTTPS</li>
            <li>Visit <a href="https://www.pwabuilder.com" target="_blank" className="text-green-600 underline">PWABuilder.com</a></li>
            <li>Enter your app URL and click "Start"</li>
            <li>Click "Build My PWA" then download the Android package</li>
            <li>Or use <code className="bg-gray-100 px-1 rounded">npx @bubblewrap/cli build</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
