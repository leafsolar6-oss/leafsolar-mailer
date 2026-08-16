import { v4 as uuidv4 } from 'uuid';
import store from './store';
import type {
  Contact, EmailList, Campaign, Template,
  Integration, EmailLog, SMTPSettings, ImportResult, CampaignStats,
} from '@/types';

const now = () => new Date().toISOString();

// ==================== CONTACTS ====================

export function getContacts(search?: string, listId?: string): Contact[] {
  let rows = store.contacts.all();

  if (listId) {
    const ids = new Set(store.lists.contactIds(listId));
    rows = rows.filter(c => ids.has(c.id));
  }

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(c =>
      (c.email || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  }

  return rows;
}

export function getContactById(id: string): Contact | null {
  return store.contacts.byId(id) || null;
}

export function addContact(data: Partial<Contact>): Contact {
  const contact: Contact = {
    id: uuidv4(),
    email: (data.email || '').toLowerCase().trim(),
    name: data.name || '',
    company: data.company || '',
    phone: data.phone || '',
    source: data.source || 'manual',
    tags: data.tags || [],
    status: data.status || 'active',
    created_at: now(),
    updated_at: now(),
  };
  store.contacts.add(contact);
  return contact;
}

export function bulkAddContacts(contacts: Partial<Contact>[]): ImportResult {
  const result: ImportResult = { success: 0, failed: 0, errors: [], duplicates: 0 };

  for (const c of contacts) {
    const email = (c.email || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.failed++;
      result.errors.push(`Invalid email: ${email || '(empty)'}`);
      continue;
    }
    if (store.contacts.byEmail(email)) {
      result.duplicates++;
      continue;
    }
    const contact: Contact = {
      id: uuidv4(),
      email: email.toLowerCase(),
      name: c.name || '',
      company: c.company || '',
      phone: c.phone || '',
      source: c.source || 'import',
      tags: c.tags || [],
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };
    store.contacts.add(contact);
    result.success++;
  }

  return result;
}

export function deleteContact(id: string): void {
  store.contacts.remove(id);
}

export function getContactCount(): number {
  return store.contacts.all().length;
}

// ==================== LISTS ====================

export function getLists(): EmailList[] {
  return store.lists.all();
}

export function getListById(id: string): EmailList | null {
  return store.lists.byId(id) || null;
}

export function createList(name: string, description: string): EmailList {
  const list: EmailList = {
    id: uuidv4(),
    name,
    description,
    contact_count: 0,
    created_at: now(),
  };
  store.lists.add(list);
  return list;
}

export function addContactsToList(listId: string, contactIds: string[]): number {
  return store.lists.addContacts(listId, contactIds);
}

export function removeContactsFromList(listId: string, contactIds: string[]): number {
  return store.lists.removeContacts(listId, contactIds);
}

export function updateListMeta(id: string, patch: Partial<EmailList>): void {
  store.lists.update(id, patch);
}

export function deleteList(id: string): void {
  store.lists.remove(id);
}

export function getListContactIds(listId: string): string[] {
  return store.lists.contactIds(listId);
}

// ==================== CAMPAIGNS ====================

export function getCampaigns(): Campaign[] {
  return store.campaigns.all();
}

export function getCampaignById(id: string): Campaign | null {
  return store.campaigns.byId(id) || null;
}

export function createCampaign(data: Partial<Campaign>): Campaign {
  const campaign: Campaign = {
    id: uuidv4(),
    name: data.name || 'Untitled Campaign',
    subject: data.subject || '',
    body: data.body || '',
    sender_name: data.sender_name || '',
    sender_email: data.sender_email || '',
    reply_to: data.reply_to || '',
    recipient_count: 0,
    sent_count: 0,
    failed_count: 0,
    status: data.status || 'draft',
    list_ids: data.list_ids || [],
    scheduled_at: null,
    sent_at: null,
    created_at: now(),
    updated_at: now(),
  };
  store.campaigns.add(campaign);
  return campaign;
}

export function updateCampaign(id: string, data: Partial<Campaign>): void {
  store.campaigns.update(id, data);
}

export function deleteCampaign(id: string): void {
  store.campaigns.remove(id);
}

// ==================== TEMPLATES ====================

export function getTemplates(): Template[] {
  return store.templates.all();
}

export function getTemplateById(id: string): Template | null {
  return store.templates.byId(id) || null;
}

export function createTemplate(data: Partial<Template>): Template {
  const t: Template = {
    id: uuidv4(),
    name: data.name || '',
    subject: data.subject || '',
    body: data.body || '',
    category: data.category || 'general',
    is_default: false,
    created_at: now(),
  };
  store.templates.add(t);
  return t;
}

export function deleteTemplate(id: string): void {
  store.templates.remove(id);
}

// ==================== INTEGRATIONS ====================

export function getIntegrations(): Integration[] {
  return store.integrations.all();
}

export function getIntegrationByPlatform(platform: string): Integration | null {
  return store.integrations.byPlatform(platform) || null;
}

export function upsertIntegration(data: Partial<Integration>): Integration {
  const existing = getIntegrationByPlatform(data.platform || '');
  const integration: Integration = existing
    ? { ...existing, ...data } as Integration
    : {
        id: uuidv4(),
        platform: data.platform || '',
        display_name: data.display_name || data.platform || '',
        api_key: data.api_key || '',
        api_secret: data.api_secret || '',
        access_token: data.access_token || '',
        refresh_token: data.refresh_token || '',
        server_prefix: data.server_prefix || '',
        connected: data.connected ?? false,
        config: data.config || {},
        last_sync: null,
        created_at: now(),
      };
  store.integrations.upsert(integration);
  return integration;
}

// ==================== SETTINGS ====================

export function getSetting(key: string): string | null {
  return store.settings.get(key) || null;
}

export function setSetting(key: string, value: string): void {
  store.settings.set(key, value);
}

export function getSMTPSettings(): SMTPSettings | null {
  // Environment variables take priority (persistent on Vercel/VPS)
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || '',
      from_name: process.env.SMTP_FROM_NAME || 'Leaf Solar',
      from_email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    };
  }
  return store.settings.getSMTP();
}

export function setSMTPSettings(s: SMTPSettings): void {
  store.settings.setSMTP(s);
}

// ==================== EMAIL LOGS ====================

export function getEmailLogs(campaignId?: string, limit = 100): EmailLog[] {
  return store.logs.all(campaignId, limit);
}

export function addEmailLog(log: Partial<EmailLog>): EmailLog {
  const entry: EmailLog = {
    id: uuidv4(),
    campaign_id: log.campaign_id || null,
    contact_email: log.contact_email || '',
    contact_name: log.contact_name || '',
    subject: log.subject || '',
    status: log.status || 'pending',
    error: log.error || '',
    sent_at: log.sent_at || null,
    created_at: now(),
  };
  store.logs.add(entry);
  return entry;
}

// ==================== STATS ====================

export function getStats(): CampaignStats {
  const campaigns = getCampaigns();
  // Count every successfully sent email from the delivery logs
  // (covers both single Compose emails and bulk campaigns).
  const logs = store.logs.all(undefined, 100000);
  const totalSent = logs.filter(l => l.status === 'sent').length;
  return {
    totalCampaigns: campaigns.length,
    totalSent,
    totalContacts: getContactCount(),
    totalLists: getLists().length,
    recentCampaigns: campaigns.slice(0, 5),
  };
}

// ==================== SEED DEFAULT TEMPLATES ====================

export function seedDefaultTemplates(): void {
  if (store.templates.all().length > 0) return;

  const templates = [
    {
      name: 'Solar Consultation Offer',
      subject: 'Switch to Solar Energy – Free Consultation for Your Home',
      category: 'promotion',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0;">☀️ Go Solar with Leaf Solar</h1>
  </div>
  <div style="padding: 30px; background: #f9fafb;">
    <p>Hello {{name}},</p>
    <p>Are you tired of rising electricity bills? At <strong>Leaf Solar</strong>, we help Nigerian homes and businesses transition to clean, affordable solar energy.</p>
    <h3>Why Choose Leaf Solar?</h3>
    <ul>
      <li>✅ Save up to 80% on electricity costs</li>
      <li>✅ Professional installation by certified engineers</li>
      <li>✅ Flexible payment plans available</li>
      <li>✅ 25-year warranty on panels</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.leafsolar.ng" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get Free Quote</a>
    </div>
    <p>Best regards,<br><strong>Leaf Solar Team</strong><br>www.leafsolar.ng</p>
  </div>
</div>`,
    },
    {
      name: 'Product Announcement',
      subject: 'Introducing Our New Solar Solutions – Discover More',
      category: 'announcement',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #0f172a; padding: 30px; text-align: center;">
    <h1 style="color: #fbbf24; margin: 0;">⚡ New from Leaf Solar</h1>
  </div>
  <div style="padding: 30px;">
    <p>Dear {{name}},</p>
    <p>We're excited to announce our latest solar solutions designed for Nigerian homes and businesses.</p>
    <p><a href="https://www.leafsolar.ng" style="color: #16a34a;">Visit our website</a> to explore the full range.</p>
    <p>Warm regards,<br>Leaf Solar Team</p>
  </div>
</div>`,
    },
    {
      name: 'Newsletter',
      subject: 'Leaf Solar Monthly Update – Solar News & Tips',
      category: 'newsletter',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #16a34a; padding: 20px; text-align: center;">
    <h2 style="color: white; margin: 0;">Leaf Solar Newsletter</h2>
  </div>
  <div style="padding: 20px;">
    <p>Hello {{name}},</p>
    <p>Here's your monthly update on all things solar.</p>
    <p>Read more on our <a href="https://www.leafsolar.ng/blog">blog</a>.</p>
    <p>— The Leaf Solar Team</p>
  </div>
</div>`,
    },
    {
      name: 'Follow Up',
      subject: 'Following Up on Your Solar Inquiry',
      category: 'followup',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="padding: 20px;">
    <p>Hi {{name}},</p>
    <p>Thank you for your interest in Leaf Solar. I wanted to follow up and see if you have any questions about our solar solutions.</p>
    <p>Feel free to reply or <a href="https://www.leafsolar.ng/contact">contact us</a> anytime.</p>
    <p>Best,<br>Leaf Solar Team</p>
  </div>
</div>`,
    },
    {
      name: 'Seasonal Promotion',
      subject: 'Special Solar Discount – Limited Time Offer!',
      category: 'promotion',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #dc2626, #ea580c); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0;">🔥 Limited Time Offer</h1>
    <p style="color: #fef3c7; font-size: 18px;">Get 15% OFF all solar installations!</p>
  </div>
  <div style="padding: 30px; background: #f9fafb;">
    <p>Hello {{name}},</p>
    <p>For a limited time, Leaf Solar is offering a special discount on all residential and commercial solar installations.</p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://www.leafsolar.ng" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Claim Your Discount</a>
    </div>
    <p>Hurry, offer ends soon!</p>
    <p>Leaf Solar Team</p>
  </div>
</div>`,
    },
  ];

  for (const t of templates) {
    const tmpl: Template = {
      id: uuidv4(),
      name: t.name,
      subject: t.subject,
      body: t.body,
      category: t.category,
      is_default: true,
      created_at: now(),
    };
    store.templates.add(tmpl);
  }
}

seedDefaultTemplates();
