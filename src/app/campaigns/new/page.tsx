'use client';
import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Send, Eye, FileText, ListChecks, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { EmailList, Template } from '@/types';

function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [senderName, setSenderName] = useState('Leaf Solar');
  const [senderEmail, setSenderEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [lists, setLists] = useState<EmailList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(setLists);
    fetch('/api/templates').then(r => r.json()).then(setTemplates);
  }, []);

  // Prefill from a template chosen on the Templates page (?template=ID)
  useEffect(() => {
    const templateId = searchParams.get('template');
    if (!templateId) return;
    fetch('/api/templates').then(r => r.json()).then((all: Template[]) => {
      const t = all.find((x: Template) => x.id === templateId);
      if (!t) return;
      setSubject(t.subject);
      setName((t.name || 'Campaign').replace(/[^\w ]+/g, '').slice(0, 60));
      if (editorRef.current) editorRef.current.innerHTML = t.body;
      toast.success(`Template "${t.name}" applied`);
    });
  }, [searchParams]);

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const applyTemplate = (t: Template) => {
    setSubject(t.subject);
    if (editorRef.current) editorRef.current.innerHTML = t.body;
    setShowTemplates(false);
    toast.success(`Template "${t.name}" applied`);
  };

  const saveCampaign = async (sendNow = false) => {
    const body = editorRef.current?.innerHTML || '';
    if (!name.trim()) { toast.error('Campaign name is required'); return; }
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Email body is required'); return; }
    if (sendNow && selectedLists.length === 0) { toast.error('Select at least one email list'); return; }

    const scheduled = scheduleMode === 'later' && scheduleAt
      ? new Date(scheduleAt).toISOString()
      : null;

    if (scheduleMode === 'later' && !scheduleAt) {
      toast.error('Pick a date & time to schedule');
      return;
    }
    if (scheduled && scheduled < new Date().toISOString()) {
      toast.error('Schedule time must be in the future');
      return;
    }

    if (sendNow) setSending(true);
    else setSaving(true);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, subject, body,
          sender_name: senderName, sender_email: senderEmail, reply_to: replyTo,
          list_ids: selectedLists,
          status: sendNow ? 'sending' : (scheduled ? 'scheduled' : 'draft'),
          scheduled_at: scheduled,
        }),
      });
      const campaign = await res.json();

      if (scheduled) {
        toast.success(`Campaign scheduled for ${new Date(scheduled).toLocaleString()}`);
        router.push('/campaigns');
        return;
      }

      if (sendNow) {
        const sendRes = await fetch('/api/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id }),
        });
        const data = await sendRes.json();
        if (sendRes.ok) {
          toast.success(`Campaign sent! ${data.sent} delivered, ${data.failed} failed`);
          router.push('/campaigns');
        } else {
          toast.error(data.error || 'Failed to send');
        }
      } else {
        toast.success('Campaign saved as draft');
        router.push('/campaigns');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  const totalRecipients = lists
    .filter(l => selectedLists.includes(l.id))
    .reduce((sum, l) => sum + l.contact_count, 0);

  return (
    <div className="animate-fade-in mt-12 lg:mt-0">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/campaigns" className="p-2 hover:bg-white rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">New Campaign</h1>
          <p className="text-sm text-gray-500">Compose your bulk email</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Campaign Info */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g., August Solar Promotion"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Your email subject line..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
            </div>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-1 p-2 border-b border-gray-100 flex-wrap bg-gray-50">
              <button onClick={() => execCmd('bold')} className="p-2 hover:bg-white rounded font-bold text-sm">B</button>
              <button onClick={() => execCmd('italic')} className="p-2 hover:bg-white rounded italic text-sm">I</button>
              <button onClick={() => execCmd('underline')} className="p-2 hover:bg-white rounded underline text-sm">U</button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => execCmd('justifyLeft')} className="p-2 hover:bg-white rounded text-sm">⬅</button>
              <button onClick={() => execCmd('justifyCenter')} className="p-2 hover:bg-white rounded text-sm">⬌</button>
              <button onClick={() => execCmd('justifyRight')} className="p-2 hover:bg-white rounded text-sm">➡</button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-white rounded text-sm">• List</button>
              <button onClick={() => execCmd('insertOrderedList')} className="p-2 hover:bg-white rounded text-sm">1. List</button>
              <button onClick={() => { const url = prompt('Enter URL:'); if (url) execCmd('createLink', url); }}
                className="p-2 hover:bg-white rounded text-sm text-blue-600">🔗 Link</button>
              <div className="flex-1" />
              <button onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                <FileText className="w-4 h-4" /> Templates
              </button>
              <button onClick={() => setPreview(!preview)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                <Eye className="w-4 h-4" /> {preview ? 'Edit' : 'Preview'}
              </button>
            </div>

            {showTemplates && (
              <div className="border-b border-gray-100 p-3 bg-green-50/50 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 mb-2">Select a template:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-green-400 hover:shadow-sm transition-all">
                      <p className="font-medium text-sm text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-500 truncate">{t.subject}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {preview ? (
              <div className="p-4 editor-content" dangerouslySetInnerHTML={{ __html: editorRef.current?.innerHTML || '<p class="text-gray-400">Nothing to preview</p>' }} />
            ) : (
              <div ref={editorRef} contentEditable
                className="p-4 editor-content min-h-[350px] focus:outline-none prose max-w-none"
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: '<p>Hello {{name}},</p><p>Write your email content here...</p>' }}
              />
            )}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              Use {'{{name}}'}, {'{{email}}'}, {'{{company}}'} for personalization
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Sender Settings */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Sender Details</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From Name</label>
              <input value={senderName} onChange={e => setSenderName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From Email</label>
              <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
                placeholder="info@leafsolar.ng" type="email"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reply-To</label>
              <input value={replyTo} onChange={e => setReplyTo(e.target.value)}
                placeholder="reply@leafsolar.ng" type="email"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          {/* Recipient Lists */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
                <ListChecks className="w-4 h-4" /> Recipients
              </h3>
              <Link href="/lists" className="text-xs text-green-600 hover:underline">Manage</Link>
            </div>
            {lists.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">No email lists yet. Create one first.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lists.map(list => (
                  <label key={list.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedLists.includes(list.id)}
                      onChange={() => {
                        setSelectedLists(prev =>
                          prev.includes(list.id) ? prev.filter(id => id !== list.id) : [...prev, list.id]
                        );
                      }}
                      className="w-4 h-4 rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{list.name}</p>
                      <p className="text-xs text-gray-400">{list.contact_count} contacts</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-bold text-green-600">{totalRecipients} total recipients</p>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" /> Schedule
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setScheduleMode('now')}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  scheduleMode === 'now' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}>
                Send now
              </button>
              <button onClick={() => setScheduleMode('later')}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  scheduleMode === 'later' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                }`}>
                Schedule
              </button>
            </div>
            {scheduleMode === 'later' && (
              <div className="animate-fade-in">
                <label className="block text-xs text-gray-500 mb-1">Send at (your local time)</label>
                <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                  className="input text-sm" />
                <p className="text-xs text-gray-400 mt-1.5">The app auto-sends scheduled campaigns when the time comes.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={() => saveCampaign(false)} disabled={saving || sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
              <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button onClick={() => saveCampaign(true)} disabled={saving || sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg shadow-green-200">
              {sending ? <><div className="w-5 h-5 spinner" /> Sending...</> : <><Send className="w-5 h-5" /> Send Campaign</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// useSearchParams requires a Suspense boundary in Next.js
export default function NewCampaignPageWrapped() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" /></div>}>
      <NewCampaignPage />
    </Suspense>
  );
}
