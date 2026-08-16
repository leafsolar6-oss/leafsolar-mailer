'use client';
import { useEffect, useState } from 'react';
import { Inbox, Mail, RefreshCw, Settings as SettingsIcon, ChevronLeft, Inbox as InboxIcon, Send, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  from: string;
  from_name: string;
  to: string;
  subject: string;
  date: string;
  preview: string;
  seen: boolean;
  body_html: string;
  body_text: string;
}

const FOLDERS = [
  { id: 'INBOX', name: 'Inbox', icon: InboxIcon },
  { id: 'Sent', name: 'Sent', icon: Send },
  { id: 'Drafts', name: 'Drafts', icon: FileText },
];

export default function InboxPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [folder, setFolder] = useState('INBOX');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [imap, setImap] = useState({
    host: 'mail.leafsolar.ng', port: 993, secure: true, user: '', pass: '',
  });

  const checkStatus = () => {
    fetch('/api/inbox?action=status').then(r => r.json()).then(d => {
      setConfigured(d.configured);
      if (d.user) setImap(prev => ({ ...prev, user: d.user, host: d.host || prev.host }));
      if (!d.configured) setShowSettings(true);
    });
  };

  const load = () => {
    setRefreshing(true);
    fetch(`/api/inbox?folder=${encodeURIComponent(folder)}&limit=50`)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(d => { if (Array.isArray(d)) setMessages(d); })
      .catch(e => toast.error(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(checkStatus, []);
  useEffect(() => { if (configured) load(); }, [configured, folder]);

  const saveSettings = async () => {
    if (!imap.host || !imap.user || !imap.pass) return toast.error('Host, email, and password required');
    const res = await fetch('/api/inbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...imap, action: 'test' }),
    });
    const test = await res.json();
    if (!test.success) return toast.error(test.error || 'Connection failed');
    await fetch('/api/inbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imap),
    });
    toast.success('Inbox connected!');
    setShowSettings(false);
    setConfigured(true);
  };

  const formatDate = (d: string) => {
    try {
      const date = new Date(d);
      const now = new Date();
      if (date.toDateString() === now.toDateString())
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <Inbox className="w-7 h-7 text-emerald-600" /> Inbox
          </h1>
          <p className="text-gray-500 text-sm">Read replies and incoming emails from your clients</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={refreshing} className="btn btn-secondary">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowSettings(true)} className="btn btn-secondary">
            <SettingsIcon className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {configured === false && !showSettings ? null : null}

      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {FOLDERS.map(f => {
            const Icon = f.icon;
            return (
              <button key={f.id} onClick={() => { setFolder(f.id); setSelected(null); }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  folder === f.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}>
                <Icon className="w-4 h-4" /> {f.name}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="p-16 text-center">
            <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No messages in {folder}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {messages.map(m => (
              <button key={m.id} onClick={() => setSelected(m)}
                className={`w-full text-left p-4 hover:bg-gray-50 flex items-start gap-3 transition-colors ${!m.seen ? 'bg-emerald-50/40' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                  !m.seen ? 'bg-emerald-600' : 'bg-gray-300'
                }`}>
                  {(m.from_name || m.from || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate ${!m.seen ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {m.from_name || m.from}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(m.date)}</span>
                  </div>
                  <p className={`text-sm truncate ${!m.seen ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                    {m.subject}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{m.preview}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message viewer */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-xl sm:hidden">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 truncate">{selected.subject}</h2>
                <p className="text-sm text-gray-500">{selected.from_name} {selected.from && `<${selected.from}>`}</p>
              </div>
              <button onClick={() => setSelected(null)} className="hidden sm:block p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {selected.body_html ? (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.body_html }} />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{selected.body_text}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => configured && setShowSettings(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-extrabold">Inbox Settings (IMAP)</h2>
              <p className="text-sm text-gray-500">Connect your mailbox to read incoming emails</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800">
                For Truehost, use <strong>mail.leafsolar.ng</strong> port <strong>993</strong> with SSL and your full email/password.
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1.5">IMAP Host</label>
                  <input value={imap.host} onChange={e => setImap({ ...imap, host: e.target.value })}
                    placeholder="mail.leafsolar.ng" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Port</label>
                  <input type="number" value={imap.port} onChange={e => setImap({ ...imap, port: +e.target.value })}
                    className="input" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={imap.secure} onChange={e => setImap({ ...imap, secure: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600" /> Use SSL/TLS
              </label>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Email Address</label>
                <input value={imap.user} onChange={e => setImap({ ...imap, user: e.target.value })}
                  placeholder="info@leafsolar.ng" type="email" className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Password</label>
                <input type="password" value={imap.pass} onChange={e => setImap({ ...imap, pass: e.target.value })}
                  className="input" />
              </div>
              <button onClick={saveSettings} className="btn btn-primary w-full">Connect Inbox</button>
              {configured && (
                <button onClick={() => setShowSettings(false)} className="btn btn-ghost w-full">Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
