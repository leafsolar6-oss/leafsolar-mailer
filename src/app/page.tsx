'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Mail, ListChecks, Send, Plus, TrendingUp,
  CheckCircle, XCircle, Clock, ArrowRight, Sun
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import type { CampaignStats, Campaign } from '@/types';

export default function Dashboard() {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(data => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="spinner" />
    </div>
  );

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    draft: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Draft' },
    sending: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Sending' },
    sent: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Sent' },
    scheduled: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Scheduled' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Failed' },
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 mt-12 lg:mt-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center shadow">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome to Leaf Solar Mailer</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard icon={Mail} label="Campaigns" value={stats?.totalCampaigns ?? 0} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard icon={Send} label="Emails Sent" value={stats?.totalSent ?? 0} color="text-green-600" bgColor="bg-green-50" />
        <StatCard icon={Users} label="Contacts" value={stats?.totalContacts ?? 0} color="text-purple-600" bgColor="bg-purple-50" />
        <StatCard icon={ListChecks} label="Email Lists" value={stats?.totalLists ?? 0} color="text-orange-600" bgColor="bg-orange-50" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Link href="/campaigns/new"
          className="bg-gradient-to-br from-green-600 to-green-700 text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow flex flex-col items-center text-center gap-2">
          <Plus className="w-8 h-8" />
          <span className="font-semibold">New Campaign</span>
        </Link>
        <Link href="/contacts?import=true"
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow flex flex-col items-center text-center gap-2">
          <Users className="w-8 h-8" />
          <span className="font-semibold">Import Contacts</span>
        </Link>
        <Link href="/integrations"
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow flex flex-col items-center text-center gap-2 col-span-2 lg:col-span-1">
          <TrendingUp className="w-8 h-8" />
          <span className="font-semibold">Sync Leads</span>
        </Link>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Recent Campaigns</h2>
          <Link href="/campaigns" className="text-sm text-green-600 font-medium flex items-center gap-1 hover:underline">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {stats.recentCampaigns.map((c: Campaign) => {
              const sc = statusConfig[c.status] || statusConfig.draft;
              const StatusIcon = sc.icon;
              return (
                <Link key={c.id} href={`/campaigns/${c.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{c.name}</p>
                    <p className="text-sm text-gray-500 truncate">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${sc.bg} ${sc.color} font-medium flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" /> {sc.label}
                    </span>
                    <span className="text-sm text-gray-400">{c.sent_count}/{c.recipient_count}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No campaigns yet. Create your first one!</p>
            <Link href="/campaigns/new"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors">
              <Plus className="w-5 h-5" /> Create Campaign
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
