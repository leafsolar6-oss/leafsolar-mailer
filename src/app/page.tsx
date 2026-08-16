'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Mail, ListChecks, Send, Plus, TrendingUp,
  CheckCircle2, XCircle, Clock, ArrowUpRight, Zap, Globe
} from 'lucide-react';
import type { CampaignStats, Campaign } from '@/types';
import { offlineFetch } from '@/lib/offline';

export default function Dashboard() {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    offlineFetch<CampaignStats>('/api/stats')
      .then(({ data, fromCache }) => { setStats(data); setFromCache(fromCache); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24"><div className="spinner" /></div>
  );

  const statCards = [
    { icon: Mail, label: 'Campaigns', value: stats?.totalCampaigns ?? 0, tint: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    { icon: Send, label: 'Emails Sent', value: stats?.totalSent ?? 0, tint: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', fg: 'text-blue-600' },
    { icon: Users, label: 'Contacts', value: stats?.totalContacts ?? 0, tint: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', fg: 'text-violet-600' },
    { icon: ListChecks, label: 'Email Lists', value: stats?.totalLists ?? 0, tint: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', fg: 'text-amber-600' },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {fromCache ? 'Showing cached data' : 'All systems operational'}
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900">
            Good to see you 👋
          </h1>
          <p className="text-gray-500 mt-1">Manage campaigns, leads, and integrations for Leaf Solar.</p>
        </div>
        <Link href="/campaigns/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Campaign
        </Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-5 relative overflow-hidden">
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br ${s.tint}`} />
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${s.fg}`} />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction href="/compose" icon={Send} title="Send Single Email"
          desc="Reach a client one-to-one" gradient="from-emerald-500 to-teal-600" />
        <QuickAction href="/contacts?import=true" icon={Users} title="Import Contacts"
          desc="CSV, Excel, paste" gradient="from-blue-500 to-indigo-600" />
        <QuickAction href="/integrations" icon={Zap} title="Sync Leads"
          desc="FB, TikTok, Mailchimp..." gradient="from-violet-500 to-fuchsia-600" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Recent Campaigns</h2>
            <p className="text-xs text-gray-500">Latest activity across your account</p>
          </div>
          <Link href="/campaigns" className="text-sm font-semibold text-emerald-600 hover:underline flex items-center gap-1">
            View all <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {stats.recentCampaigns.map((c: Campaign) => <CampaignRow key={c.id} c={c} />)}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">No campaigns yet. Launch your first one!</p>
            <Link href="/campaigns/new" className="btn btn-primary">
              <Plus className="w-4 h-4" /> Create Campaign
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, desc, gradient }: any) {
  return (
    <Link href={href} className="card p-5 group hover:shadow-lg transition-all">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </Link>
  );
}

function CampaignRow({ c }: { c: Campaign }) {
  const statusMap: Record<string, { icon: any; color: string; label: string }> = {
    draft: { icon: Clock, color: 'bg-gray-100 text-gray-600', label: 'Draft' },
    sending: { icon: TrendingUp, color: 'bg-blue-50 text-blue-600', label: 'Sending' },
    sent: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', label: 'Sent' },
    scheduled: { icon: Clock, color: 'bg-amber-50 text-amber-600', label: 'Scheduled' },
    failed: { icon: XCircle, color: 'bg-red-50 text-red-600', label: 'Failed' },
  };
  const s = statusMap[c.status] || statusMap.draft;
  const Icon = s.icon;
  return (
    <Link href={`/campaigns/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Mail className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{c.name}</p>
        <p className="text-sm text-gray-500 truncate">{c.subject}</p>
      </div>
      <span className={`badge ${s.color}`}><Icon className="w-3 h-3" /> {s.label}</span>
      <span className="text-sm text-gray-400 hidden sm:inline">{c.sent_count}/{c.recipient_count}</span>
    </Link>
  );
}
