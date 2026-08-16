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
