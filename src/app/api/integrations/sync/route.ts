import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationByPlatform, bulkAddContacts, upsertIntegration } from '@/lib/queries';

// Sync leads from connected marketing platforms
export async function POST(req: NextRequest) {
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
