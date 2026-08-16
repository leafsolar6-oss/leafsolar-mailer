import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationByPlatform, bulkAddContacts, upsertIntegration } from '@/lib/queries';
import { requireAuth } from '@/lib/auth';

// Sync leads from connected marketing platforms
export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const { platform } = await req.json();
    const integration = getIntegrationByPlatform(platform);

    if (!integration || !integration.connected) {
      return NextResponse.json({ error: 'Integration not connected' }, { status: 400 });
    }

    let leads: any[] = [];

    switch (platform) {
      case 'mailchimp': {
        const dc = integration.server_prefix || 'us1';
        const res = await fetch(
          `https://${dc}.api.mailchimp.com/3.0/lists?count=100&fields=lists.id,lists.name`,
          { headers: { Authorization: `Bearer ${integration.api_key}` } }
        );
        if (!res.ok) throw new Error(`Mailchimp API error: ${res.status}`);
        const data = await res.json();
        // Fetch members from first list (or all)
        for (const list of data.lists || []) {
          const membersRes = await fetch(
            `https://${dc}.api.mailchimp.com/3.0/lists/${list.id}/members?count=1000&status=subscribed`,
            { headers: { Authorization: `Bearer ${integration.api_key}` } }
          );
          if (membersRes.ok) {
            const membersData = await membersRes.json();
            leads.push(...(membersData.members || []).map((m: any) => ({
              email: m.email_address,
              name: `${m.merge_fields?.FNAME || ''} ${m.merge_fields?.LNAME || ''}`.trim(),
              company: m.merge_fields?.COMPANY || '',
              phone: m.merge_fields?.PHONE || '',
              source: 'mailchimp',
              tags: ['mailchimp', list.name],
            })));
          }
        }
        break;
      }

      case 'sendinblue':
      case 'brevo': {
        const res = await fetch('https://api.brevo.com/v3/contacts?limit=1000', {
          headers: { 'api-key': integration.api_key, accept: 'application/json' }
        });
        if (!res.ok) throw new Error(`Brevo API error: ${res.status}`);
        const data = await res.json();
        leads = (data.contacts || []).map((c: any) => ({
          email: c.email,
          name: c.attributes?.FIRSTNAME ? `${c.attributes.FIRSTNAME} ${c.attributes.LASTNAME || ''}`.trim() : '',
          company: c.attributes?.COMPANY || '',
          phone: c.attributes?.SMS || '',
          source: 'brevo',
          tags: ['brevo', ...(c.listIds || []).map(String)],
        }));
        break;
      }

      case 'hubspot': {
        const res = await fetch(
          'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,company,phone',
          { headers: { Authorization: `Bearer ${integration.access_token}`, 'Content-Type': 'application/json' } }
        );
        if (!res.ok) throw new Error(`HubSpot API error: ${res.status}`);
        const data = await res.json();
        leads = (data.results || []).map((c: any) => ({
          email: c.properties?.email,
          name: `${c.properties?.firstname || ''} ${c.properties?.lastname || ''}`.trim(),
          company: c.properties?.company || '',
          phone: c.properties?.phone || '',
          source: 'hubspot',
          tags: ['hubspot'],
        }));
        break;
      }

      case 'mailgun': {
        // Mailgun stores mailing lists
        const authHeader = 'Basic ' + Buffer.from(`api:${integration.api_key}`).toString('base64');
        const res = await fetch(
          `https://api.mailgun.net/v3/lists/pages?address&limit=100`,
          { headers: { Authorization: authHeader } }
        );
        if (res.ok) {
          const data = await res.json();
          for (const list of data.items || []) {
            const membersRes = await fetch(`https://api.mailgun.net/v3/lists/${list.address}/members/pages?limit=1000`, {
              headers: { Authorization: 'Basic ' + Buffer.from(`api:${integration.api_key}`).toString('base64') }
            });
            if (membersRes.ok) {
              const membersData = await membersRes.json();
              leads.push(...(membersData.items || []).map((m: any) => ({
                email: m.address,
                name: m.name || '',
                source: 'mailgun',
                tags: ['mailgun', list.address],
              })));
            }
          }
        }
        break;
      }

      case 'convertkit': {
        const res = await fetch('https://api.convertkit.com/v3/subscribers?api_key=' + integration.api_key + '&limit=1000');
        if (!res.ok) throw new Error(`ConvertKit API error: ${res.status}`);
        const data = await res.json();
        leads = (data.subscribers || []).map((s: any) => ({
          email: s.email_address,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          source: 'convertkit',
          tags: ['convertkit'],
        }));
        break;
      }

      case 'activecampaign': {
        const acUrl = integration.server_prefix; // e.g., https://youraccount.api-us1.com
        const res = await fetch(`${acUrl}/api/3/contacts?limit=100`, {
          headers: { 'Api-Token': integration.api_key }
        });
        if (!res.ok) throw new Error(`ActiveCampaign API error: ${res.status}`);
        const data = await res.json();
        leads = (data.contacts || []).map((c: any) => ({
          email: c.email,
          name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          phone: c.phone || '',
          source: 'activecampaign',
          tags: ['activecampaign'],
        }));
        break;
      }

      case 'facebook': {
        // Facebook / Meta Lead Ads
        // Requires a Page access token with leads_read permission and the Page ID.
        const pageId = integration.server_prefix
          || (integration.config as any)?.page_id
          || 'me';
        const token = integration.access_token || integration.api_key;
        // Fetch leadgen forms for the page
        const formsRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?limit=100&fields=id,name,locale&access_token=${encodeURIComponent(token)}`
        );
        if (!formsRes.ok) {
          const t = await formsRes.text();
          throw new Error(`Facebook API error ${formsRes.status}: ${t.slice(0, 200)}`);
        }
        const formsData = await formsRes.json();
        for (const form of formsData.data || []) {
          let after = '';
          // Paginate leads per form
          for (let page = 0; page < 20; page++) {
            const url = `https://graph.facebook.com/v21.0/${form.id}/leads?limit=500&fields=created_time,field_data,id${after ? `&after=${after}` : ''}&access_token=${encodeURIComponent(token)}`;
            const leadsRes = await fetch(url);
            if (!leadsRes.ok) break;
            const leadsPage = await leadsRes.json();
            for (const lead of leadsPage.data || []) {
              const fields: Record<string, string> = {};
              for (const f of lead.field_data || []) {
                fields[(f.name || '').toLowerCase()] = Array.isArray(f.values) ? f.values.join(' ') : (f.values || '');
              }
              const email = fields.email || fields.email_address || fields['work email'] || fields['e-mail'];
              const phone = fields.phone_number || fields.phone || fields['phone number'] || '';
              const fullName = fields.full_name || [fields['first name'], fields['last name']].filter(Boolean).join(' ') || fields.name || '';
              if (email) {
                leads.push({
                  email,
                  name: fullName,
                  company: fields.company || fields['company name'] || '',
                  phone,
                  source: 'facebook',
                  tags: ['facebook', form.name || 'lead-ad'],
                });
              }
            }
            const paging = leadsPage.paging?.cursors?.after;
            if (!paging || !leadsPage.data?.length) break;
            after = paging;
          }
        }
        break;
      }

      case 'instagram': {
        // Instagram Leads via Meta Graph API (same token as Facebook).
        // Instagram lead ads are associated with a Facebook Page; the leads
        // appear under that Page's leadgen_forms. We fetch forms and filter
        // for Instagram-located leads by tagging accordingly.
        const pageId = integration.server_prefix
          || (integration.config as any)?.page_id
          || 'me';
        const token = integration.access_token || integration.api_key;
        const formsRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?limit=100&fields=id,name,locale,status&access_token=${encodeURIComponent(token)}`
        );
        if (!formsRes.ok) {
          const t = await formsRes.text();
          throw new Error(`Instagram API error ${formsRes.status}: ${t.slice(0, 200)}`);
        }
        const formsData = await formsRes.json();
        for (const form of formsData.data || []) {
          let after = '';
          for (let page = 0; page < 20; page++) {
            const url = `https://graph.facebook.com/v21.0/${form.id}/leads?limit=500&fields=created_time,field_data,platform,ad_name,ad_id${after ? `&after=${after}` : ''}&access_token=${encodeURIComponent(token)}`;
            const leadsRes = await fetch(url);
            if (!leadsRes.ok) break;
            const leadsPage = await leadsRes.json();
            for (const lead of leadsPage.data || []) {
              const fields: Record<string, string> = {};
              for (const f of lead.field_data || []) {
                fields[(f.name || '').toLowerCase()] = Array.isArray(f.values) ? f.values.join(' ') : (f.values || '');
              }
              const email = fields.email || fields.email_address || fields['work email'] || fields['e-mail'];
              if (email) {
                leads.push({
                  email,
                  name: fields.full_name || [fields['first name'], fields['last name']].filter(Boolean).join(' ') || fields.name || '',
                  company: fields.company || '',
                  phone: fields.phone_number || fields.phone || '',
                  source: 'instagram',
                  tags: ['instagram', form.name || 'ig-lead', lead.platform || 'instagram'],
                });
              }
            }
            const paging = leadsPage.paging?.cursors?.after;
            if (!paging || !leadsPage.data?.length) break;
            after = paging;
          }
        }
        break;
      }

      case 'linkedin': {
        // LinkedIn Lead Gen Forms via Marketing API.
        // Requires an access token with r_ads_lead_access / rw_ads scopes.
        // server_prefix = the LinkedIn Ad Account ID (numeric)
        // api_key = access token
        const accountId = integration.server_prefix || (integration.config as any)?.account_id;
        const token = integration.api_key || integration.access_token;
        if (!accountId) throw new Error('LinkedIn Ad Account ID required (set in Server Prefix)');
        // LinkedIn uses an Author/Owner URN in X-Restli-Protocol header.
        // First get the authenticated member
        const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202405' },
        });
        if (!profileRes.ok) throw new Error(`LinkedIn auth error: ${profileRes.status}`);
        const profile = await profileRes.json();
        const owner = `urn:li:person:${profile.sub}`;

        // List lead gen forms for the account
        const formsRes = await fetch(
          `https://api.linkedin.com/rest/adLeadGenForms?q=account&account=urn:li:sponsoredAccount:${accountId}`,
          { headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202405', 'X-Restli-Protocol-Version': '2.0.0' } }
        );
        if (!formsRes.ok) {
          const t = await formsRes.text();
          throw new Error(`LinkedIn forms error ${formsRes.status}: ${t.slice(0, 200)}`);
        }
        const formsData = await formsRes.json();
        for (const form of formsData.elements || []) {
          // Fetch leads for each form (up to 100 per form)
          const leadsRes = await fetch(
            `https://api.linkedin.com/rest/adLeadGenForms/${form.id}/leads?q=owners&owner=${encodeURIComponent(owner)}&count=100`,
            { headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202405', 'X-Restli-Protocol-Version': '2.0.0' } }
          );
          if (!leadsRes.ok) continue;
          const leadsData = await leadsRes.json();
          for (const lead of leadsData.elements || []) {
            const fields: Record<string, string> = {};
            for (const cv of lead.specificInfo?.com.linkedin.leadgenforms.SubmitLead?.lead?.leadType?.leadFields || []) {
              if (cv.name) fields[cv.name.name.toLowerCase()] = cv.values?.[0]?.value || '';
            }
            // Fallback for lead response fields
            const email = fields.email || fields['email address'] || fields['work email'];
            if (email) {
              leads.push({
                email,
                name: fields.firstname && fields.lastname ? `${fields.firstname} ${fields.lastname}` : (fields.name || ''),
                company: fields.company || '',
                phone: fields.phone || '',
                source: 'linkedin',
                tags: ['linkedin', form.name || 'linkedin-lead'],
              });
            }
          }
        }
        break;
      }

      case 'twitter':
      case 'x': {
        // X (Twitter) Lead Generation Cards via Ads API.
        // Requires an access token + access token secret (OAuth 1.0a User Context)
        // plus the ads account ID in server_prefix.
        // Because OAuth 1.0a signing is involved, this endpoint expects the
        // access_token and access_token_secret to have already been obtained.
        const accountId = integration.server_prefix;
        const accessToken = integration.access_token;
        const accessSecret = integration.api_secret;
        if (!accountId) throw new Error('X Ads Account ID required (set in Server Prefix)');
        if (!accessToken || !accessSecret) throw new Error('X requires both Access Token and Access Token Secret');

        // The Ads API requires OAuth 1.0a signing. We use a lightweight
        // implementation here (crypto is available in the Node runtime).
        const crypto = await import('crypto');
        const oauthSign = (method: string, url: string) => {
          const oauth: Record<string, string> = {
            oauth_consumer_key: integration.api_key,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: accessToken,
            oauth_version: '1.0',
          };
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(oauth)) params.append(k, v);
          const base = `${method.toUpperCase()}&${encodeURIComponent(url.split('?')[0])}&${encodeURIComponent(params.toString())}`;
          const key = `${encodeURIComponent(integration.refresh_token || '')}&${encodeURIComponent(accessSecret)}`;
          oauth.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');
          return 'OAuth ' + Object.entries(oauth).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(', ');
        };

        // Fetch lead generation cards for the account
        const cardsUrl = `https://api.x.com/9/accounts/${accountId}/lead_gen_cards?count=100`;
        const cardsRes = await fetch(cardsUrl, { headers: { Authorization: oauthSign('GET', cardsUrl) } });
        if (!cardsRes.ok) {
          const t = await cardsRes.text();
          throw new Error(`X API error ${cardsRes.status}: ${t.slice(0, 200)}`);
        }
        const cards = await cardsRes.json();
        for (const card of cards.data || []) {
          const leadsUrl = `https://api.x.com/9/accounts/${accountId}/lead_gen_cards/${card.id}/leads?count=100`;
          const leadsRes = await fetch(leadsUrl, { headers: { Authorization: oauthSign('GET', leadsUrl) } });
          if (!leadsRes.ok) continue;
          const leadsData = await leadsRes.json();
          for (const lead of leadsData.data || []) {
            const email = lead.email || lead.email_address || lead.work_email;
            if (email) {
              leads.push({
                email,
                name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
                company: lead.company || '',
                phone: lead.phone || '',
                source: 'twitter',
                tags: ['twitter', 'x', card.name || 'x-lead'],
              });
            }
          }
        }
        break;
      }

      case 'youtube': {
        // YouTube doesn't have a direct "lead" API. We import contacts that
        // have interacted via YouTube Channel lead forms / contact info.
        // Most practical: import via Google Forms responses that feed a sheet,
        // or use the YouTube Data API to pull channel members comments.
        // Here we support the "YouTube Lead Forms" (Studio lead gen) endpoint
        // via the YouTube Data API with an OAuth access token.
        const token = integration.access_token || integration.api_key;
        const channelId = integration.server_prefix;
        // List channel lead messages if available
        const url = `https://youtubeleads.googleapis.com/v1/leads?pageSize=100${channelId ? `&filter=channel_id=${channelId}` : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`YouTube API error ${res.status}: ${t.slice(0, 200)}`);
        }
        const data = await res.json();
        for (const lead of data.leads || []) {
          if (lead.email) {
            leads.push({
              email: lead.email,
              name: lead.name || lead.display_name || '',
              phone: lead.phone || '',
              source: 'youtube',
              tags: ['youtube', 'video-lead'],
            });
          }
        }
        break;
      }

      case 'pinterest': {
        // Pinterest Ads Lead Gen via Conversions API / lead ads export.
        // Pinterest provides lead download via the Ads API. Requires
        // ad_account_id in server_prefix and an access token.
        const adAccountId = integration.server_prefix;
        const token = integration.access_token || integration.api_key;
        if (!adAccountId) throw new Error('Pinterest Ad Account ID required');
        // Fetch lead reports (Pinterest returns lead data via the ads/leads endpoint)
        const res = await fetch(
          `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/leads?page_size=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Pinterest API error ${res.status}: ${t.slice(0, 200)}`);
        }
        const data = await res.json();
        for (const lead of data.items || []) {
          const email = lead.email || lead.lead_email || lead.customer_email;
          if (email) {
            leads.push({
              email,
              name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
              company: lead.company || '',
              phone: lead.phone || '',
              source: 'pinterest',
              tags: ['pinterest', 'pin-lead'],
            });
          }
        }
        break;
      }

      case 'snapchat': {
        // Snapchat Ads Lead Gen via Marketing API.
        // Requires ad account ID in server_prefix and access token.
        const adAccountId = integration.server_prefix;
        const token = integration.access_token || integration.api_key;
        if (!adAccountId) throw new Error('Snapchat Ad Account ID required');
        const res = await fetch(
          `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/leads?limit=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Snapchat API error ${res.status}: ${t.slice(0, 200)}`);
        }
        const data = await res.json();
        for (const lead of data.leads || []) {
          const fields: Record<string, string> = {};
          for (const f of lead.lead_fields || []) fields[(f.name || '').toLowerCase()] = f.value || '';
          const email = fields.email || fields.email_address || fields['work email'];
          if (email) {
            leads.push({
              email,
              name: fields.full_name || fields.name || '',
              phone: fields.phone || '',
              source: 'snapchat',
              tags: ['snapchat', 'snap-lead'],
            });
          }
        }
        break;
      }

      case 'whatsapp': {
        // WhatsApp Business / Cloud API: import contacts who have messaged
        // the business phone number. Requires the phone number ID and a
        // permanent system-user access token.
        const phoneNumberId = integration.server_prefix;
        const token = integration.access_token || integration.api_key;
        if (!phoneNumberId) throw new Error('WhatsApp Phone Number ID required (set in Server Prefix)');
        // List conversations / contacts (the Cloud API exposes media and
        // messages; contacts are derived from recent conversations).
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/contacts?limit=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`WhatsApp API error ${res.status}: ${t.slice(0, 200)}`);
        }
        const data = await res.json();
        for (const c of data.data || []) {
          // WhatsApp rarely exposes email; we store the phone and create a
          // placeholder email address so the contact record is usable.
          const phone = c.wa_id || c.phone_number || '';
          const email = c.email || (phone ? `wa-${phone.replace(/[^0-9]/g, '')}@contact.local` : '');
          if (email) {
            leads.push({
              email,
              name: c.profile?.name || c.name || '',
              phone,
              source: 'whatsapp',
              tags: ['whatsapp', 'messaging'],
            });
          }
        }
        break;
      }

      case 'telegram': {
        // Telegram Bot API: import contacts who have started a chat with
        // the bot. Requires the bot token in api_key. Telegram does not
        // expose email natively, so we derive a placeholder.
        const botToken = integration.api_key;
        if (!botToken) throw new Error('Telegram bot token required');
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`);
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Telegram API error ${res.status}: ${t.slice(0, 200)}`);
        }
        const data = await res.json();
        const seen = new Set<string>();
        for (const update of data.result || []) {
          const msg = update.message || update.edited_message;
          const from = msg?.from;
          if (from?.id && !seen.has(from.id.toString())) {
            seen.add(from.id.toString());
            const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
            const phone = from.phone_number || '';
            leads.push({
              email: `tg-${from.id}@contact.local`,
              name,
              phone,
              source: 'telegram',
              tags: ['telegram', 'messaging', from.username ? `@${from.username}` : ''],
            });
          }
        }
        break;
      }

      case 'tiktok': {
        // TikTok Business / Marketing API leads
        // Requires advertiser ID in server_prefix (e.g. 1234567890) and an access token
        // with leads.read scope.
        const advertiserId = integration.server_prefix || (integration.config as any)?.advertiser_id;
        const token = integration.access_token || integration.api_key;
        if (!advertiserId) throw new Error('TikTok advertiser ID is required (set it in Server Prefix)');

        // First, list lead ads / forms under the advertiser
        const formsRes = await fetch(
          `https://business-api.tiktok.com/open_api/v1.3/lead/list/`,
          {
            method: 'POST',
            headers: {
              'Access-Token': token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              advertiser_id: advertiserId,
              page: 1,
              page_size: 100,
            }),
          }
        );
        if (!formsRes.ok) {
          const t = await formsRes.text();
          throw new Error(`TikTok API error ${formsRes.status}: ${t.slice(0, 200)}`);
        }
        const formsData = await formsRes.json();
        if (formsData.code !== 0) {
          throw new Error(`TikTok error: ${formsData.message || 'unknown'}`);
        }
        for (const lead of formsData.data?.leads || formsData.data?.list || []) {
          const email = lead.email || lead.email_address || lead.lead_email;
          if (email) {
            leads.push({
              email,
              name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.name || '',
              company: lead.company || '',
              phone: lead.phone || lead.phone_number || '',
              source: 'tiktok',
              tags: ['tiktok', lead.campaign_name || 'tiktok-lead'],
            });
          }
        }
        break;
      }

      case 'custom': {
        // Generic webhook/API import - fetch from custom endpoint
        const endpoint = (integration.config as any)?.endpoint;
        if (!endpoint) throw new Error('Custom API endpoint not configured');
        const res = await fetch(endpoint, {
          headers: (integration.config as any)?.headers ? JSON.parse((integration.config as any).headers) : {}
        });
        if (!res.ok) throw new Error(`Custom API error: ${res.status}`);
        const data = await res.json();
        const emailField = (integration.config as any)?.emailField || 'email';
        const nameField = (integration.config as any)?.nameField || 'name';
        leads = (Array.isArray(data) ? data : (data.contacts || data.data || data.results || [])).map((c: any) => ({
          email: c[emailField],
          name: c[nameField] || '',
          source: 'custom-api',
          tags: ['custom-api'],
        }));
        break;
      }

      default:
        return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
    }

    // Filter out invalid emails and import
    const validLeads = leads.filter(l => l.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email));
    const result = bulkAddContacts(validLeads);

    // Update last sync
    upsertIntegration({ ...integration, last_sync: new Date().toISOString(), connected: true });

    return NextResponse.json({
      success: true,
      fetched: leads.length,
      imported: result.success,
      duplicates: result.duplicates,
      failed: result.failed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
