'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Inbox, Mail, RefreshCw, Settings as SettingsIcon, ChevronLeft,
  Inbox as InboxIcon, Send, FileText, CornerUpLeft, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  message_id: string;
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

interface ReplyForm { to: string; to_name: string; subject: string; body: string; in_reply_to: string; }

export default function InboxPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState('INBOX');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [fullMsg, setFullMsg] = useState<Message | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [replying, setReplying] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyForm, setReplyForm] = useState<ReplyForm>({ to: '', to_name: '', subject: '', body: '', in_reply_to: '' });
  const [imap, setImap] = useState({ host: 'mail.leafsolar.ng', port: 993, secure: true, user: '', pass: '' });

  const checkStatus = () => {
    fetch('/api/inbox?action=status').then(r => r.json()).then(d => {
      setConfigured(d.configured);
      if (d.user) setImap(prev => ({ ...prev, user: d.user, host: d.host || prev.host }));
      if (!d.configured) setShowSettings(true);
    });
  };

  const loadFolders = useCallback(() => {
    fetch('/api/inbox?action=folders').then(r => r.json()).then(d => {
      if (Array.isArray(d.folders)) setFolders(d.folders);
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setRefreshing(true);
    fetch(`/api/inbox?folder=${encodeURIComponent(folder)}&limit=50`)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(d => { if (Array.isArray(d)) setMessages(d); })
      .catch(e => toast.error(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [folder]);

  useEffect(checkStatus, []);
  useEffect(() => { if (configured) { loadFolders(); load(); } }, [configured, folder, loadFolders, load]);

  // Resolve friendly tabs to real IMAP folder names.
  const tabs = useCallback(() => {
    const find = (pats: RegExp[]) => folders.find(f => pats.some(p => p.test(f))) || null;
    const inbox = folders.find(f => /^inbox$/i.test(f)) || 'INBOX';
    const sent = find([/^sent$/i, /sent items/i, /sent mail/i]) || folders.find(f => /sent/i.test(f) && !/spam|junk/i.test(f)) || 'Sent';
    const drafts = find([/^drafts$/i, /draft/i]) || 'Drafts';
    return [
      { id: inbox, name: 'Inbox', icon: InboxIcon },
      { id: sent, name: 'Sent', icon: Send },
      { id: drafts, name: 'Drafts', icon: FileText },
    ];
  }, [folders]);

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

  const openMessage = async (m: Message) => {
    setSelected(m);
    setFullMsg(null);
    setLoadingFull(true);
    // Fetch the FULL message content (no size cap).
    try {
      const res = await fetch(`/api/inbox?action=message&folder=${encodeURIComponent(folder)}&uid=${m.id}`);
      if (res.ok) {
        const full = await res.json();
        setFullMsg(full);
        if (!full.seen) {
          // Mark as read (best-effort).
          fetch(`/api/inbox?action=read&folder=${encodeURIComponent(folder)}&uid=${m.id}`).catch(() => {});
        }
      } else {
        setFullMsg(m); // fall back to the list copy
      }
    } catch {
      setFullMsg(m);
    } finally {
      setLoadingFull(false);
    }
  };

  const startReply = (m: Message) => {
    const display = m.from_name || m.from;
    setReplyForm({
      to: m.from,
      to_name: m.from_name || '',
      subject: /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`,
      body: '',
      in_reply_to: m.message_id || '',
    });
    setReplying(true);
  };

  const sendReply = async () => {
    if (!replyForm.to || !replyForm.subject.trim() || !replyForm.body.trim()) {
      return toast.error('Recipient, subject and message are required');
    }
    setSendingReply(true);
    try {
      // Turn plain text into simple paragraphs for the HTML email.
      const html = replyForm.body.split(/\n+/).map(p => `<p>${p.trim()}</p>`).join('');
      const res = await fetch('/api/inbox', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', ...replyForm, body: html }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'Reply failed');
      toast.success('Reply sent');
      setReplying(false);
      load(); // refresh so the reply shows in Sent
    } catch (e: any) {
      toast.error(e.message || 'Reply failed');
    } finally {
      setSendingReply(false);
    }
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

  const currentTabs = tabs();
  const activeTab = currentTabs.find(t => t.id === folder) || currentTabs[0];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <Inbox className="w-7 h-7 text-emerald-600" /> Inbox
          </h1>
          <p className="text-gray-500 text-sm">Read replies, view sent messages, and reply to clients</p>
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

      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {currentTabs.map(f => {
            const Icon = f.icon;
            return (
              <button key={f.id} onClick={() => { setFolder(f.id); setSelected(null); setFullMsg(null); }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  folder === f.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}>
                <Icon className="w-4 h-4" /> {f.name}
              </button>
            );
          })}
        </div>

        {!configured ? (
          <div className="p-12 text-center">
            <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Connect your mailbox to read incoming emails and replies.</p>
            <button onClick={() => setShowSettings(true)} className="btn btn-primary">
              <SettingsIcon className="w-4 h-4" /> Connect Inbox
            </button>
          </div>
        ) : loading ? (
          <div className="p-12 flex justify-center"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="p-16 text-center">
            <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No messages in {activeTab?.name || folder}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {messages.map(m => (
              <button key={m.id} onClick={() => openMessage(m)}
                className={`w-full text-left p-4 hover:bg-gray-50 flex items-start gap-3 transition-colors ${!m.seen ? 'bg-emerald-50/40' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                  !m.seen ? 'bg-emerald-600' : 'bg-gray-300'
                }`}>
                  {(m.from_name || m.from || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate ${!m.seen ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {m.from_name || m.from || '(unknown sender)'}
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
      {selected && !replying && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setSelected(null); setFullMsg(null); }} />
          <div className="relative bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => { setSelected(null); setFullMsg(null); }} className="p-2 hover:bg-gray-100 rounded-xl sm:hidden">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 truncate">{selected.subject}</h2>
                <p className="text-sm text-gray-500 truncate">
                  {selected.from_name} {selected.from && `<${selected.from}>`}
                </p>
                <p className="text-xs text-gray-400">To: {selected.to || '—'} · {formatDate(selected.date)}</p>
              </div>
              <button onClick={() => { setSelected(null); setFullMsg(null); }} className="hidden sm:block p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {loadingFull ? (
                <div className="flex justify-center py-10"><div className="spinner" /></div>
              ) : (fullMsg?.body_html) ? (
                <div className="prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: fullMsg.body_html }} />
              ) : (fullMsg?.body_text) ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{fullMsg.body_text}</pre>
              ) : (
                <p className="text-gray-400 text-sm">(No readable content in this message.)</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => startReply(selected)} className="btn btn-primary flex-1">
                <CornerUpLeft className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => { setSelected(null); setFullMsg(null); }} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply composer */}
      {replying && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReplying(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <CornerUpLeft className="w-5 h-5 text-emerald-600" /> Reply
              </h2>
              <button onClick={() => setReplying(false)} className="p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">To</label>
                <input value={replyForm.to} onChange={e => setReplyForm({ ...replyForm, to: e.target.value })}
                  className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject</label>
                <input value={replyForm.subject} onChange={e => setReplyForm({ ...replyForm, subject: e.target.value })}
                  className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message</label>
                <textarea value={replyForm.body} onChange={e => setReplyForm({ ...replyForm, body: e.target.value })}
                  rows={10} placeholder="Type your reply…" className="input resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={sendReply} disabled={sendingReply} className="btn btn-primary flex-1 disabled:opacity-60">
                {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingReply ? 'Sending…' : 'Send Reply'}
              </button>
              <button onClick={() => setReplying(false)} className="btn btn-secondary">Cancel</button>
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
