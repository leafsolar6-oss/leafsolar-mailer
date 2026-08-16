'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Mail, Clock, CheckCircle, XCircle, TrendingUp, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Campaign } from '@/types';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const load = () => {
    fetch('/api/campaigns').then(r => r.json()).then(data => {
      setCampaigns(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (id: string) => {
    if (!confirm('Send this campaign to all recipients in selected lists?')) return;
    setSending(id);
    const res = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: id }),
    });
    const data = await res.json();
    setSending(null);
    if (res.ok) {
      toast.success(`Sent ${data.sent} emails (${data.failed} failed)`);
      load();
    } else {
      toast.error(data.error || 'Failed to send');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await fetch('/api/campaigns', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast.success('Campaign deleted');
    load();
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    draft: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Draft' },
    sending: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Sending' },
    sent: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Sent' },
    scheduled: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Scheduled' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
  };

  return (
    <div className="animate-fade-in mt-12 lg:mt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campaigns</h1>
          <p className="text-sm text-gray-500">Create and manage your email campaigns</p>
        </div>
        <Link href="/campaigns/new"
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors shadow">
          <Plus className="w-5 h-5" /> <span className="hidden sm:inline">New Campaign</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No campaigns yet</p>
          <Link href="/campaigns/new"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700">
            <Plus className="w-5 h-5" /> Create Your First Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const sc = statusConfig[c.status] || statusConfig.draft;
            const StatusIcon = sc.icon;
            return (
              <div key={c.id} className="bg-white rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-800">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} font-medium flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" /> {sc.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{c.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{c.recipient_count} recipients</span>
                      <span>{c.sent_count} sent</span>
                      {c.failed_count > 0 && <span className="text-red-400">{c.failed_count} failed</span>}
                      <span className="hidden sm:inline">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.status === 'draft' && (
                      <button onClick={() => handleSend(c.id)} disabled={sending === c.id}
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50">
                        {sending === c.id ? <div className="w-5 h-5 spinner" /> : <Send className="w-5 h-5" />}
                      </button>
                    )}
                    <Link href={`/campaigns/${c.id}`}
                      className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                      <Mail className="w-5 h-5" />
                    </Link>
                    <button onClick={() => handleDelete(c.id)}
                      className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
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
