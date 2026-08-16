'use client';
import { useEffect, useState } from 'react';
import {
  Plug, RefreshCw, CheckCircle2, Settings, ExternalLink, Zap, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Integration } from '@/types';
import { offlineFetch } from '@/lib/offline';

interface Platform {
  id: string;
  name: string;
  description: string;
  category: 'email' | 'social' | 'crm';
  brand: string;
  gradient: string;
  fields: { key: string; label: string; type: string; placeholder: string; help?: string }[];
  docs: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'facebook', name: 'Facebook Lead Ads', category: 'social',
    description: 'Import leads from Meta/Facebook lead forms automatically',
    brand: 'f',
    gradient: 'from-blue-600 to-blue-800',
    fields: [
      { key: 'access_token', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxx...', help: 'Requires leads_read permission' },
      { key: 'server_prefix', label: 'Page ID', type: 'text', placeholder: '123456789012345', help: 'Your Facebook Page ID (or leave "me")' },
    ],
    docs: 'https://developers.facebook.com/docs/marketing-api/guides/lead-ads/',
  },
  {
    id: 'instagram', name: 'Instagram Lead Ads', category: 'social',
    description: 'Sync leads from Instagram lead generation ads (via Meta)',
    brand: '◉',
    gradient: 'from-fuchsia-500 via-pink-500 to-amber-400',
    fields: [
      { key: 'access_token', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxx...', help: 'Same token as Facebook — Instagram leads appear via your Page' },
      { key: 'server_prefix', label: 'Facebook Page ID', type: 'text', placeholder: '123456789012345', help: 'The Facebook Page linked to your Instagram business account' },
    ],
    docs: 'https://developers.facebook.com/docs/marketing-api/guides/lead-ads/',
  },
  {
    id: 'tiktok', name: 'TikTok Business', category: 'social',
    description: 'Sync leads from TikTok Lead Generation ads',
    brand: '♪',
    gradient: 'from-gray-900 to-pink-600',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Access token with leads.read scope' },
      { key: 'server_prefix', label: 'Advertiser ID', type: 'text', placeholder: '1234567890' },
    ],
    docs: 'https://business-api.tiktok.com/portal/docs?id=1739584855420929',
  },
  {
    id: 'linkedin', name: 'LinkedIn Lead Gen', category: 'social',
    description: 'Import leads from LinkedIn Sponsored Content lead forms',
    brand: 'in',
    gradient: 'from-sky-600 to-blue-800',
    fields: [
      { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'AQVA...', help: 'OAuth token with r_ads_lead_access scope' },
      { key: 'server_prefix', label: 'Ad Account ID', type: 'text', placeholder: '123456789', help: 'Numeric LinkedIn Ad Account ID' },
    ],
    docs: 'https://learn.microsoft.com/en-us/linkedin/marketing/lead-gen',
  },
  {
    id: 'twitter', name: 'X (Twitter) Ads', category: 'social',
    description: 'Pull leads from X Lead Generation Cards',
    brand: '𝕏',
    gradient: 'from-gray-800 to-black',
    fields: [
      { key: 'api_key', label: 'API Key (Consumer Key)', type: 'password', placeholder: 'Consumer key from your X app' },
      { key: 'refresh_token', label: 'API Secret (Consumer Secret)', type: 'password', placeholder: 'Consumer secret' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'OAuth access token' },
      { key: 'api_secret', label: 'Access Token Secret', type: 'password', placeholder: 'OAuth token secret' },
      { key: 'server_prefix', label: 'Ads Account ID', type: 'text', placeholder: '18ce24y...' },
    ],
    docs: 'https://developer.x.com/en/docs/x-ads-api/lead-generation',
  },
  {
    id: 'youtube', name: 'YouTube Lead Forms', category: 'social',
    description: 'Import leads from YouTube video lead forms',
    brand: '▶',
    gradient: 'from-red-500 to-red-700',
    fields: [
      { key: 'access_token', label: 'OAuth Access Token', type: 'password', placeholder: 'ya29...', help: 'Google OAuth token with YouTube scope' },
      { key: 'server_prefix', label: 'Channel ID (optional)', type: 'text', placeholder: 'UC...' },
    ],
    docs: 'https://www.youtube.com/ads/',
  },
  {
    id: 'pinterest', name: 'Pinterest Ads', category: 'social',
    description: 'Sync leads from Pinterest Pin lead ads',
    brand: 'P',
    gradient: 'from-red-600 to-rose-700',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'pina_...' },
      { key: 'server_prefix', label: 'Ad Account ID', type: 'text', placeholder: '123456789012' },
    ],
    docs: 'https://developers.pinterest.com/docs/api/v5/',
  },
  {
    id: 'snapchat', name: 'Snapchat Ads', category: 'social',
    description: 'Import leads from Snapchat Lead Generation ads',
    brand: '👻',
    gradient: 'from-yellow-300 to-yellow-500',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Bearer token' },
      { key: 'server_prefix', label: 'Ad Account ID', type: 'text', placeholder: '123a45bc-...' },
    ],
    docs: 'https://marketingapi.snapchat.com/docs/',
  },
  {
    id: 'whatsapp', name: 'WhatsApp Business', category: 'social',
    description: 'Import contacts who messaged your WhatsApp Business number',
    brand: 'W',
    gradient: 'from-green-500 to-emerald-600',
    fields: [
      { key: 'access_token', label: 'Permanent System Token', type: 'password', placeholder: 'EAAxxxxx...', help: 'From Meta Business Settings' },
      { key: 'server_prefix', label: 'Phone Number ID', type: 'text', placeholder: '10584789...', help: 'WhatsApp Business Phone Number ID' },
    ],
    docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  },
  {
    id: 'telegram', name: 'Telegram Bot', category: 'social',
    description: 'Collect contacts who start a chat with your Telegram bot',
    brand: '✈',
    gradient: 'from-sky-400 to-blue-600',
    fields: [
      { key: 'api_key', label: 'Bot Token', type: 'text', placeholder: '123456:ABC-DEF...', help: 'From @BotFather' },
    ],
    docs: 'https://core.telegram.org/bots/features#botfather',
  },
  {
    id: 'mailchimp', name: 'Mailchimp', category: 'email',
    description: 'Sync subscribers from your Mailchimp audiences',
    brand: 'M',
    gradient: 'from-yellow-400 to-amber-500',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'abc123-us14' },
      { key: 'server_prefix', label: 'Data Center', type: 'text', placeholder: 'us14' },
    ],
    docs: 'https://us1.admin.mailchimp.com/account/api/',
  },
  {
    id: 'brevo', name: 'Brevo (Sendinblue)', category: 'email',
    description: 'Import contacts from Brevo email marketing',
    brand: 'B',
    gradient: 'from-emerald-500 to-teal-600',
    fields: [
      { key: 'api_key', label: 'API Key (v3)', type: 'password', placeholder: 'xkeysib-...' },
    ],
    docs: 'https://app.brevo.com/settings/keys/api',
  },
  {
    id: 'hubspot', name: 'HubSpot', category: 'crm',
    description: 'Import CRM contacts as leads',
    brand: 'H',
    gradient: 'from-orange-500 to-red-600',
    fields: [
      { key: 'access_token', label: 'Private App Access Token', type: 'password', placeholder: 'pat-na1-...' },
    ],
    docs: 'https://developers.hubspot.com/docs/api/private-apps',
  },
  {
    id: 'mailgun', name: 'Mailgun', category: 'email',
    description: 'Import members from Mailgun mailing lists',
    brand: '@',
    gradient: 'from-red-500 to-rose-700',
    fields: [
      { key: 'api_key', label: 'Private API Key', type: 'password', placeholder: 'key-...' },
    ],
    docs: 'https://app.mailgun.com/app/account/security/api_keys',
  },
  {
    id: 'convertkit', name: 'ConvertKit', category: 'email',
    description: 'Sync subscribers from ConvertKit',
    brand: 'C',
    gradient: 'from-rose-500 to-pink-600',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your API key' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Your API secret' },
    ],
    docs: 'https://app.convertkit.com/account_settings/advanced_settings',
  },
  {
    id: 'activecampaign', name: 'ActiveCampaign', category: 'crm',
    description: 'Import contacts from ActiveCampaign CRM',
    brand: 'A',
    gradient: 'from-blue-500 to-cyan-600',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your API key' },
      { key: 'server_prefix', label: 'Account URL', type: 'text', placeholder: 'https://youraccount.api-us1.com' },
    ],
    docs: 'https://www.activecampaign.com/login',
  },
  {
    id: 'custom', name: 'Custom API / Webhook', category: 'crm',
    description: 'Connect any REST API or lead source',
    brand: '⚡',
    gradient: 'from-violet-500 to-purple-700',
    fields: [
      { key: 'api_key', label: 'API Key / Token (optional)', type: 'password', placeholder: 'Bearer token' },
    ],
    docs: '',
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [configPlatform, setConfigPlatform] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customEmailField, setCustomEmailField] = useState('email');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'social' | 'email' | 'crm'>('all');

  const load = () => {
    offlineFetch<Integration[]>('/api/integrations')
      .then(r => setIntegrations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openConfig = (p: Platform) => {
    const existing = integrations.find(i => i.platform === p.id);
    const v: Record<string, string> = {};
    if (existing) {
      v.api_key = existing.api_key;
      v.api_secret = existing.api_secret;
      v.access_token = existing.access_token;
      v.server_prefix = existing.server_prefix;
      if (p.id === 'custom') {
        setCustomEndpoint((existing.config as any)?.endpoint || '');
        setCustomEmailField((existing.config as any)?.emailField || 'email');
      }
    }
    setValues(v);
    setConfigPlatform(p.id);
  };

  const save = async () => {
    const p = PLATFORMS.find(x => x.id === configPlatform);
    if (!p) return;
    const config: any = {};
    if (p.id === 'custom') { config.endpoint = customEndpoint; config.emailField = customEmailField; }
    await offlineFetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: p.id, display_name: p.name,
        api_key: values.api_key || '', api_secret: values.api_secret || '',
        access_token: values.access_token || '', server_prefix: values.server_prefix || '',
        connected: true, config,
      }),
    });
    toast.success(`${p.name} connected`);
    setConfigPlatform(null);
    load();
  };

  const sync = async (platform: string) => {
    setSyncing(platform);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (res.ok) toast.success(`Synced ${data.imported} new leads`);
      else toast.error(data.error || 'Sync failed');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(null);
    }
  };

  const status = (id: string) => integrations.find(i => i.platform === id);
  const filtered = PLATFORMS.filter(p => filter === 'all' || p.category === filter);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'social', label: 'Social Ads' },
    { id: 'email', label: 'Email' },
    { id: 'crm', label: 'CRM' },
  ] as const;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Integrations</h1>
          <p className="text-gray-500 mt-1">Connect marketing platforms to import leads automatically</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">{PLATFORMS.length} platforms</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id as any)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === c.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const st = status(p.id);
            const connected = st?.connected;
            return (
              <div key={p.id} className="card p-5 hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.gradient} text-white font-extrabold text-xl flex items-center justify-center shadow-md`}>
                    {p.brand}
                  </div>
                  {connected ? (
                    <span className="badge bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-500">Not connected</span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5 mb-4 min-h-[2.5rem]">{p.description}</p>
                {st?.last_sync && (
                  <p className="text-xs text-gray-400 mb-3">
                    Last sync: {new Date(st.last_sync).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => openConfig(p)}
                    className="btn btn-secondary !py-2 !px-3 flex-1 text-xs">
                    <Settings className="w-3.5 h-3.5" /> {connected ? 'Configure' : 'Connect'}
                  </button>
                  {connected && (
                    <button onClick={() => sync(p.id)} disabled={syncing === p.id}
                      className="btn btn-primary !py-2 !px-3 text-xs">
                      {syncing === p.id ? <div className="spinner !w-3.5 !h-3.5 !border-white/40 !border-t-white" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Sync
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Zap className="w-5 h-5" /></div>
          <div>
            <h3 className="font-bold">How lead syncing works</h3>
            <p className="text-sm text-emerald-50 mt-1">
              1. Connect a platform with your API credentials. 2. Tap <strong>Sync</strong> to pull leads into Contacts.
              3. Use them in campaigns or send one-to-one emails. Synced leads are tagged by source for filtering.
            </p>
          </div>
        </div>
      </div>

      {configPlatform && (
        <ConfigModal
          platform={PLATFORMS.find(p => p.id === configPlatform)!}
          values={values} setValues={setValues}
          customEndpoint={customEndpoint} setCustomEndpoint={setCustomEndpoint}
          customEmailField={customEmailField} setCustomEmailField={setCustomEmailField}
          onClose={() => setConfigPlatform(null)} onSave={save}
        />
      )}
    </div>
  );
}

function ConfigModal({ platform, values, setValues, customEndpoint, setCustomEndpoint, customEmailField, setCustomEmailField, onClose, onSave }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-5 border-b border-gray-100 sticky top-0 bg-white flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Configure {platform.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {platform.fields.map((f: any) => (
            <div key={f.key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
              <input type={f.type} value={values[f.key] || ''}
                onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder} className="input" />
              {f.help && <p className="text-xs text-gray-400 mt-1">{f.help}</p>}
            </div>
          ))}
          {platform.id === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Endpoint URL</label>
                <input value={customEndpoint} onChange={e => setCustomEndpoint(e.target.value)}
                  placeholder="https://api.example.com/leads" className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Field Name</label>
                <input value={customEmailField} onChange={e => setCustomEmailField(e.target.value)} className="input" />
              </div>
            </>
          )}
          {platform.docs && (
            <a href={platform.docs} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold hover:underline">
              Get API keys for {platform.name} <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button onClick={onSave} className="btn btn-primary w-full">
            <Plug className="w-4 h-4" /> Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}
