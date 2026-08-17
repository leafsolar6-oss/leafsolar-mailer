'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Mail, Clock, CheckCircle2, XCircle, TrendingUp, Trash2, Send, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Campaign } from '@/types';
import { offlineFetch } from '@/lib/offline';
import { playSentSound } from '@/lib/sounds';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const load = () => {
    offlineFetch<Campaign[]>('/api/campaigns')
      .then(r => setCampaigns(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const send = async (id: string) => {
    if (!confirm('Send this campaign to all selected recipients?')) return;
    setSending(id);
    const res = await fetch('/api/campaigns/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: id }),
    });
    const data = await res.json();
    setSending(null);
    if (res.ok) { playSentSound(); toast.success(`Sent ${data.sent} (${data.failed} failed)`); load(); }
    else toast.error(data.error);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await fetch('/api/campaigns', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast.success('Deleted'); load();
  };

  const statusMap: Record<string, { icon: any; cls: string; label: string }> = {
    draft: { icon: Clock, cls: 'bg-gray-100 text-gray-600', label: 'Draft' },
    sending: { icon: TrendingUp, cls: 'bg-blue-50 text-blue-600', label: 'Sending' },
    sent: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600', label: 'Sent' },
    scheduled: { icon: CalendarClock, cls: 'bg-amber-50 text-amber-600', label: 'Scheduled' },
    failed: { icon: XCircle, cls: 'bg-red-50 text-red-600', label: 'Failed' },
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Campaigns</h1>
          <p className="text-gray-500 text-sm">Create, send, and track your bulk email campaigns</p>
        </div>
        <Link href="/campaigns/new" className="btn btn-primary"><Plus className="w-4 h-4" /> New Campaign</Link>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner" /></div>
       : campaigns.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-4">No campaigns yet</p>
          <Link href="/campaigns/new" className="btn btn-primary"><Plus className="w-4 h-4" /> Create First Campaign</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {campaigns.map(c => {
            const s = statusMap[c.status] || statusMap.draft;
            const Icon = s.icon;
            const progress = c.recipient_count > 0 ? (c.sent_count / c.recipient_count) * 100 : 0;
            return (
              <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900 truncate">{c.name}</h3>
                      <span className={`badge ${s.cls}`}><Icon className="w-3 h-3" /> {s.label}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{c.subject}</p>
                    {c.status === 'scheduled' && c.scheduled_at && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" /> Sends {new Date(c.scheduled_at).toLocaleString()}
                      </p>
                    )}
                    {c.status === 'sent' && (
                      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{c.recipient_count} recipients</span>
                      <span className="text-emerald-600 font-semibold">{c.sent_count} sent</span>
                      {c.failed_count > 0 && <span className="text-red-500">{c.failed_count} failed</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {c.status === 'draft' && (
                      <button onClick={() => send(c.id)} disabled={sending === c.id}
                        className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                        {sending === c.id ? <div className="spinner !w-5 !h-5" /> : <Send className="w-5 h-5" />}
                      </button>
                    )}
                    <Link href={`/campaigns/${c.id}`} className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100">
                      <Mail className="w-5 h-5" />
                    </Link>
                    <button onClick={() => del(c.id)} className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
