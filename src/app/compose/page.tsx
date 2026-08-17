'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Bold, Italic, Underline, Link2, List, Eye, FileText, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { offlineFetch } from '@/lib/offline';
import { playSentSound } from '@/lib/sounds';
import type { Contact, Template } from '@/types';

export default function ComposePage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [to, setTo] = useState('');
  const [toName, setToName] = useState('');
  const [subject, setSubject] = useState('');
  const [senderName, setSenderName] = useState('Leaf Solar');
  const [senderEmail, setSenderEmail] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    offlineFetch<Template[]>('/api/templates').then(r => setTemplates(r.data)).catch(() => {});
    offlineFetch<Contact[]>('/api/contacts').then(r => setContacts(r.data)).catch(() => {});
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const pickContact = (email: string, name: string) => {
    setTo(email);
    setToName(name);
  };

  const applyTemplate = (t: Template) => {
    setSubject(t.subject);
    if (editorRef.current) editorRef.current.innerHTML = t.body;
    setShowTemplates(false);
    toast.success(`Applied "${t.name}"`);
  };

  const send = async () => {
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return toast.error('Enter a valid recipient email');
    if (!subject.trim()) return toast.error('Subject is required');
    const body = editorRef.current?.innerHTML || '';
    if (!body.trim()) return toast.error('Email body is empty');

    setSending(true);
    try {
      const { data } = await offlineFetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to, to_name: toName, subject, body,
          sender_name: senderName, sender_email: senderEmail,
        }),
      });
      if (data.queued) {
        toast.success('Saved to outbox — will send when online');
      } else {
        playSentSound();
        toast.success('Email sent successfully');
      }
      router.push('/');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    !to || c.email.toLowerCase().includes(to.toLowerCase()) || c.name.toLowerCase().includes(to.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-black/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Compose Email</h1>
          <p className="text-sm text-gray-500">Send a personalized message to an individual client</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 space-y-4 border-b border-gray-100">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To</label>
            <input value={to} onChange={e => setTo(e.target.value)}
              placeholder="client@example.com"
              className="input" />
            {to && filteredContacts.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 card overflow-hidden">
                {filteredContacts.map(c => (
                  <button key={c.id} onClick={() => pickContact(c.email, c.name)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex justify-between items-center">
                    <span><span className="font-semibold">{c.name || '(no name)'}</span> <span className="text-gray-400">{c.email}</span></span>
                    {c.company && <span className="text-xs text-gray-400">{c.company}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Recipient Name</label>
              <input value={toName} onChange={e => setToName(e.target.value)}
                placeholder="(used for {{name}})" className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Email subject..." className="input" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 p-2 border-b border-gray-100 flex-wrap bg-gray-50/60">
          <ToolBtn onClick={() => exec('bold')}><Bold className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec('italic')}><Italic className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec('underline')}><Underline className="w-4 h-4" /></ToolBtn>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <ToolBtn onClick={() => exec('insertUnorderedList')}><List className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => { const u = prompt('URL:'); if (u) exec('createLink', u); }}><Link2 className="w-4 h-4" /></ToolBtn>
          <div className="flex-1" />
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="btn btn-ghost text-xs">
            <FileText className="w-4 h-4" /> Templates
          </button>
          <button onClick={() => setPreview(!preview)} className="btn btn-ghost text-xs">
            <Eye className="w-4 h-4" /> {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {showTemplates && (
          <div className="p-4 bg-emerald-50/50 border-b border-gray-100 grid sm:grid-cols-2 gap-2">
            {templates.map(t => (
              <button key={t.id} onClick={() => applyTemplate(t)}
                className="text-left p-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-400 hover:shadow-sm transition-all">
                <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 truncate">{t.subject}</p>
              </button>
            ))}
          </div>
        )}

        {preview ? (
          <div className="p-6 editor-content"
            dangerouslySetInnerHTML={{ __html: editorRef.current?.innerHTML.replace(/{{name}}/g, toName || 'there') || '<p class="text-gray-400">Nothing to preview</p>' }} />
        ) : (
          <div ref={editorRef} contentEditable suppressContentEditableWarning
            className="p-6 editor-content min-h-[300px] focus:outline-none prose max-w-none"
            dangerouslySetInnerHTML={{ __html: `<p>Hi ${toName || 'there'},</p><p>Write your message...</p>` }} />
        )}

        <div className="p-5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-3 text-xs text-gray-500">
            <label>From:
              <input value={senderName} onChange={e => setSenderName(e.target.value)}
                className="input ml-2 !py-1.5 !text-xs w-40" />
            </label>
          </div>
          <button onClick={send} disabled={sending} className="btn btn-primary">
            {sending ? <div className="spinner !w-4 !h-4 !border-white/40 !border-t-white" /> : <Send className="w-4 h-4" />}
            Send Email
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        💡 Use <code className="bg-gray-100 px-1.5 py-0.5 rounded">{'{{name}}'}</code> in the body to insert the recipient's name automatically.
      </p>
    </div>
  );
}

function ToolBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="p-2 rounded-lg hover:bg-white text-gray-600 transition-colors">
      {children}
    </button>
  );
}
