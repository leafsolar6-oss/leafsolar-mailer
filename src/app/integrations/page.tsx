'use client';
import { useEffect, useState } from 'react';
import {
  Plug, RefreshCw, CheckCircle, XCircle, Settings, Mail,
  Zap, Globe, Users, ChevronRight, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Integration } from '@/types';

const PLATFORMS = [
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sync subscribers from your Mailchimp audiences',
    icon: '🐵',
    color: 'bg-yellow-50 border-yellow-200',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'e.g., abc123-us14' },
      { key: 'server_prefix', label: 'Data Center (e.g., us14)', type: 'text', placeholder: 'us14' },
    ],
    docsUrl: 'https://us1.admin.mailchimp.com/account/api/',
  },
  {
    id: 'brevo',
    name: 'Brevo (Sendinblue)',
    description: 'Import contacts from Brevo email marketing',
    icon: '💚',
    color: 'bg-green-50 border-green-200',
    fields: [
      { key: 'api_key', label: 'API Key (v3)', type: 'password', placeholder: 'xkeysib-...' },
    ],
    docsUrl: 'https://app.brevo.com/settings/keys/api',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Import CRM contacts as leads',
    icon: '🟠',
    color: 'bg-orange-50 border-orange-200',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'pat-na1-...' },
    ],
    docsUrl: 'https://app.hubspot.com/private-apps',
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    description: 'Import members from Mailgun mailing lists',
    icon: '✉️',
    color: 'bg-red-50 border-red-200',
    fields: [
      { key: 'api_key', label: 'Private API Key', type: 'password', placeholder: 'key-...' },
    ],
    docsUrl: 'https://app.mailgun.com/app/account/security/api_keys',
  },
  {
    id: 'convertkit',
    name: 'ConvertKit',
    description: 'Sync subscribers from ConvertKit',
    icon: '🔴',
    color: 'bg-rose-50 border-rose-200',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your API key' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Your API secret' },
    ],
    docsUrl: 'https://app.convertkit.com/account_settings/advanced_settings',
  },
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    description: 'Import contacts from ActiveCampaign CRM',
    icon: '🔵',
    color: 'bg-blue-50 border-blue-200',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your API key' },
      { key: 'server_prefix', label: 'Account URL', type: 'text', placeholder: 'https://youraccount.api-us1.com' },
    ],
    docsUrl: 'https://youraccount.activehosted.com/app/settings/developer',
  },
  {
    id: 'custom',
    name: 'Custom API / Webhook',
    description: 'Connect to any REST API or lead source',
    icon: '🔌',
    color: 'bg-purple-50 border-purple-200',
    fields: [
      { key: 'api_key', label: 'API Key / Token (optional)', type: 'password', placeholder: 'Bearer token or API key' },
    ],
    docsUrl: '',
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [configPlatform, setConfigPlatform] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customEmailField, setCustomEmailField] = useState('email');
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = () => {
    fetch('/api/integrations').then(r => r.json()).then(data => {
      setIntegrations(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const openConfig = (platformId: string) => {
    const existing = integrations.find(i => i.platform === platformId);
    const values: Record<string, string> = {};
    if (existing) {
      values.api_key = existing.api_key;
      values.api_secret = existing.api_secret;
      values.access_token = existing.access_token;
      values.server_prefix = existing.server_prefix;
      if (platformId === 'custom') {
        setCustomEndpoint((existing.config as any)?.endpoint || '');
        setCustomEmailField((existing.config as any)?.emailField || 'email');
      }
    }
    setConfigValues(values);
    setConfigPlatform(platformId);
  };

  const saveConfig = async () => {
    const platform = PLATFORMS.find(p => p.id === configPlatform);
    if (!platform) return;

    const config: any = {};
    if (configPlatform === 'custom') {
      config.endpoint = customEndpoint;
      config.emailField = customEmailField;
    }

    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: configPlatform,
        display_name: platform.name,
        api_key: configValues.api_key || '',
        api_secret: configValues.api_secret || '',
        access_token: configValues.access_token || '',
        server_prefix: configValues.server_prefix || '',
        connected: true,
        config,
      }),
    });
    toast.success(`${platform.name} connected!`);
    setConfigPlatform(null);
    load();
  };

  const syncLeads = async (platformId: string) => {
    setSyncing(platformId);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Synced ${data.imported} new leads (${data.duplicates} duplicates)`);
        load();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(null);
    }
  };

  const getStatus = (platformId: string) => integrations.find(i => i.platform === platformId);

  return (
    <div className="animate-fade-in mt-12 lg:mt-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Integrations</h1>
        <p className="text-sm text-gray-500">Connect marketing platforms to import leads automatically</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {PLATFORMS.map(platform => {
            const status = getStatus(platform.id);
            const connected = status?.connected;
            return (
              <div key={platform.id} className={`bg-white rounded-2xl p-5 border-2 ${connected ? 'border-green-200' : 'border-gray-100'} shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${platform.color} border`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{platform.name}</h3>
                      {connected && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle className="w-3 h-3" /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{platform.description}</p>
                    {status?.last_sync && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last sync: {new Date(status.last_sync).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openConfig(platform.id)}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Settings className="w-4 h-4" /> {connected ? 'Settings' : 'Connect'}
                  </button>
                  {connected && (
                    <button onClick={() => syncLeads(platform.id)} disabled={syncing === platform.id}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {syncing === platform.id ? (
                        <div className="w-4 h-4 spinner" style={{ borderWidth: 2 }} />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Sync Leads
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-6 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 text-white">
        <div className="flex items-start gap-3">
          <Zap className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold mb-1">How It Works</h3>
            <p className="text-sm text-green-100">
              1. Connect your marketing platform using API keys. 2. Click "Sync Leads" to import contacts.
              3. Synced leads appear in your Contacts automatically. 4. Use them in email campaigns!
            </p>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {configPlatform && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfigPlatform(null)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold">
                Configure {PLATFORMS.find(p => p.id === configPlatform)?.name}
              </h2>
              <button onClick={() => setConfigPlatform(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {PLATFORMS.find(p => p.id === configPlatform)?.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={configValues[field.key] || ''}
                    onChange={e => setConfigValues({ ...configValues, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              ))}

              {configPlatform === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint URL</label>
                    <input value={customEndpoint} onChange={e => setCustomEndpoint(e.target.value)}
                      placeholder="https://api.example.com/leads"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
                    <p className="text-xs text-gray-400 mt-1">
                      Must return JSON array or object with contacts/data/results array
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Field Name</label>
                    <input value={customEmailField} onChange={e => setCustomEmailField(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                </>
              )}

              {PLATFORMS.find(p => p.id === configPlatform)?.docsUrl && (
                <a href={PLATFORMS.find(p => p.id === configPlatform)?.docsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:underline">
                  <Globe className="w-4 h-4" /> Get API keys from {PLATFORMS.find(p => p.id === configPlatform)?.name}
                  <ChevronRight className="w-4 h-4" />
                </a>
              )}

              <button onClick={saveConfig}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                <Plug className="w-5 h-5" /> Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
