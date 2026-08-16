'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Send, Trash2, Mail, CheckCircle, XCircle, Users,
  Eye, MousePointerClick, Download, CalendarClock, UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Campaign as CampaignType, EmailLog } from '@/types';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignType | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = () => {
    Promise.all([
      fetch(`/api/campaigns`).then(r => r.json()),
      fetch(`/api/logs?campaignId=${params.id}`).then(r => r.json()),
    ]).then(([campaigns, logsData]) => {
      setCampaign(campaigns.find((c: CampaignType) => c.id === params.id) || null);
      setLogs(logsData);
      setLoading(false);
    });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.id]);

  const handleSend = async () => {
    if (!confirm('Send this campaign now?')) return;
    setSending(true);
    const res = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: params.id }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      if (data.scheduled) toast.success(`Scheduled for ${new Date(data.scheduled_at).toLocaleString()}`);
      else toast.success(`Sent ${data.sent}, ${data.failed} failed`);
      load();
    } else toast.error(data.error);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this campaign?')) return;
    await fetch('/api/campaigns', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: params.id }),
    });
    toast.success('Deleted');
    router.push('/campaigns');
  };

  const exportCsv = () => {
    window.open(`/api/campaigns/export?campaignId=${params.id}`, '_blank');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!campaign) return <div className="text-center py-20 text-gray-500">Campaign not found</div>;

  const delivered = logs.filter(l => l.status === 'sent');
  const opened = delivered.filter(l => l.opened_at);
  const clicked = delivered.filter(l => l.clicked_at);
  const engaged = delivered.filter(l => l.opened_at || l.clicked_at);
  const openRate = delivered.length ? Math.round((opened.length / delivered.length) * 100) : 0;
  const clickRate = delivered.length ? Math.round((clicked.length / delivered.length) * 100) : 0;

  const isScheduled = campaign.status === 'scheduled' && campaign.scheduled_at;

  return (
    <div className="animate-fade-in mt-12 lg:mt-0">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/campaigns" className="p-2 hover:bg-white rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{campaign.name}</h1>
          <p className="text-sm text-gray-500">{campaign.subject}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={Users} color="text-blue-500" label="Recipients" value={campaign.recipient_count} />
        <StatCard icon={CheckCircle} color="text-green-500" label="Delivered" value={campaign.sent_count} />
        <StatCard icon={XCircle} color="text-red-500" label="Failed" value={campaign.failed_count} />
        <StatCard icon={Eye} color="text-violet-500" label="Opened" value={opened.length} sub={delivered.length ? `${openRate}%` : ''} />
        <StatCard icon={MousePointerClick} color="text-amber-500" label="Clicked" value={clicked.length} sub={delivered.length ? `${clickRate}%` : ''} />
        <StatCard icon={UserX} color="text-teal-500" label="Engaged" value={engaged.length} sub={delivered.length ? `${Math.round((engaged.length / delivered.length) * 100)}%` : ''} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap mb-6">
        {campaign.status === 'draft' && (
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50">
            {sending ? <div className="w-5 h-5 spinner" /> : <Send className="w-5 h-5" />} Send Now
          </button>
        )}
        {isScheduled && (
          <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium">
            <CalendarClock className="w-4 h-4" /> Sends {new Date(campaign.scheduled_at!).toLocaleString()}
          </span>
        )}
        {campaign.status === 'sent' && (
          <button onClick={exportCsv}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 px-5 py-2.5 rounded-xl font-medium hover:bg-blue-100">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
        <button onClick={handleDelete}
          className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-medium hover:bg-red-100">
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      {/* Email Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
          <Mail className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-sm text-gray-700">Email Content</span>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: campaign.body }} />
      </div>

      {/* Send Log */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Delivery & Engagement Log</h3>
          <span className="text-xs text-gray-400">{logs.length} entries</span>
        </div>
        {logs.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No delivery logs yet</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 text-sm gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{log.contact_email}</p>
                  {log.contact_name && <p className="text-xs text-gray-400">{log.contact_name}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {log.status === 'sent' && (
                    <>
                      <span className={`flex items-center gap-1 text-[11px] font-semibold ${log.opened_at ? 'text-violet-600' : 'text-gray-300'}`}>
                        <Eye className="w-3.5 h-3.5" /> {log.open_count || 0}
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] font-semibold ${log.clicked_at ? 'text-amber-600' : 'text-gray-300'}`}>
                        <MousePointerClick className="w-3.5 h-3.5" /> {log.click_count || 0}
                      </span>
                    </>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    log.status === 'sent' ? 'bg-green-50 text-green-600' :
                    log.status === 'failed' ? 'bg-red-50 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub }: any) {
  return (
    <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
      <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className={`text-[11px] font-bold ${color}`}>{sub}</p>}
    </div>
  );
}
