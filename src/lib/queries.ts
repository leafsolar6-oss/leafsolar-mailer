import db from './db';
import { v4 as uuidv4 } from 'uuid';
import type {
  Contact, EmailList, Campaign, Template,
  Integration, EmailLog, SMTPSettings, ImportResult, CampaignStats
} from '@/types';

// ==================== CONTACTS ====================

export function getContacts(search?: string, listId?: string): Contact[] {
  let query = 'SELECT * FROM contacts';
  const params: string[] = [];
  const conditions: string[] = [];

  if (search) {
    conditions.push('(email LIKE ? OR name LIKE ? OR company LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (listId) {
    query += ' INNER JOIN list_contacts lc ON contacts.id = lc.contact_id WHERE lc.list_id = ?';
    params.unshift(listId);
    if (conditions.length) {
      query += ' AND ' + conditions.join(' AND ');
    }
  } else if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
}

export function getContactById(id: string): Contact | null {
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as any;
  if (!row) return null;
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

export function addContact(data: Partial<Contact>): Contact {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO contacts (id, email, name, company, phone, source, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.email || '',
    data.name || '',
    data.company || '',
    data.phone || '',
    data.source || 'manual',
    JSON.stringify(data.tags || []),
    data.status || 'active'
  );
  return getContactById(id)!;
}

export function bulkAddContacts(contacts: Partial<Contact>[]): ImportResult {
  const result: ImportResult = { success: 0, failed: 0, errors: [], duplicates: 0 };
  const insert = db.prepare(`
    INSERT OR IGNORE INTO contacts (id, email, name, company, phone, source, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: Partial<Contact>[]) => {
    for (const c of items) {
      if (!c.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
        result.failed++;
        result.errors.push(`Invalid email: ${c.email || '(empty)'}`);
        continue;
      }
      const id = uuidv4();
      const info = insert.run(
        id, c.email.toLowerCase().trim(), c.name || '', c.company || '',
        c.phone || '', c.source || 'import', JSON.stringify(c.tags || []), 'active'
      );
      if (info.changes > 0) result.success++;
      else result.duplicates++;
    }
  });

  insertMany(contacts);
  return result;
}

export function deleteContact(id: string): void {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
}

export function getContactCount(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM contacts').get() as any;
  return row.count;
}

// ==================== LISTS ====================

export function getLists(): EmailList[] {
  return db.prepare('SELECT * FROM email_lists ORDER BY created_at DESC').all() as EmailList[];
}

export function getListById(id: string): EmailList | null {
  return db.prepare('SELECT * FROM email_lists WHERE id = ?').get(id) as EmailList | null;
}

export function createList(name: string, description: string): EmailList {
  const id = uuidv4();
  db.prepare('INSERT INTO email_lists (id, name, description) VALUES (?, ?, ?)').run(id, name, description);
  return getListById(id)!;
}

export function addContactsToList(listId: string, contactIds: string[]): number {
  const insert = db.prepare('INSERT OR IGNORE INTO list_contacts (list_id, contact_id) VALUES (?, ?)');
  let count = 0;
  const tx = db.transaction((ids: string[]) => {
    for (const cid of ids) {
      const info = insert.run(listId, cid);
      count += info.changes;
    }
  });
  tx(contactIds);
  // Update count
  const row = db.prepare('SELECT COUNT(*) as c FROM list_contacts WHERE list_id = ?').get(listId) as any;
  db.prepare('UPDATE email_lists SET contact_count = ? WHERE id = ?').run(row.c, listId);
  return count;
}

export function deleteList(id: string): void {
  db.prepare('DELETE FROM email_lists WHERE id = ?').run(id);
}

export function getListContactIds(listId: string): string[] {
  const rows = db.prepare('SELECT contact_id FROM list_contacts WHERE list_id = ?').all(listId) as any[];
  return rows.map(r => r.contact_id);
}

// ==================== CAMPAIGNS ====================

export function getCampaigns(): Campaign[] {
  const rows = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all() as any[];
  return rows.map(r => ({ ...r, list_ids: JSON.parse(r.list_ids || '[]') }));
}

export function getCampaignById(id: string): Campaign | null {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;
  if (!row) return null;
  return { ...row, list_ids: JSON.parse(row.list_ids || '[]') };
}

export function createCampaign(data: Partial<Campaign>): Campaign {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO campaigns (id, name, subject, body, sender_name, sender_email, reply_to, list_ids, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name || 'Untitled Campaign', data.subject || '', data.body || '',
    data.sender_name || '', data.sender_email || '', data.reply_to || '',
    JSON.stringify(data.list_ids || []), data.status || 'draft'
  );
  return getCampaignById(id)!;
}

export function updateCampaign(id: string, data: Partial<Campaign>): void {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'list_ids') {
      fields.push(`${key} = ?`);
      values.push(JSON.stringify(value));
    } else {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteCampaign(id: string): void {
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
}

// ==================== TEMPLATES ====================

export function getTemplates(): Template[] {
  return db.prepare('SELECT * FROM templates ORDER BY is_default DESC, created_at DESC').all() as Template[];
}

export function getTemplateById(id: string): Template | null {
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template | null;
}

export function createTemplate(data: Partial<Template>): Template {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO templates (id, name, subject, body, category)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.name || '', data.subject || '', data.body || '', data.category || 'general');
  return getTemplateById(id)!;
}

export function deleteTemplate(id: string): void {
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
}

// ==================== INTEGRATIONS ====================

export function getIntegrations(): Integration[] {
  const rows = db.prepare('SELECT * FROM integrations ORDER BY connected DESC, display_name').all() as any[];
  return rows.map(r => ({ ...r, connected: !!r.connected, config: JSON.parse(r.config || '{}') }));
}

export function getIntegrationByPlatform(platform: string): Integration | null {
  const row = db.prepare('SELECT * FROM integrations WHERE platform = ?').get(platform) as any;
  if (!row) return null;
  return { ...row, connected: !!row.connected, config: JSON.parse(row.config || '{}') };
}

export function upsertIntegration(data: Partial<Integration>): Integration {
  const existing = getIntegrationByPlatform(data.platform || '');
  if (existing) {
    db.prepare(`
      UPDATE integrations SET
        api_key = ?, api_secret = ?, access_token = ?, refresh_token = ?,
        server_prefix = ?, connected = ?, config = ?, last_sync = datetime('now')
      WHERE platform = ?
    `).run(
      data.api_key || '', data.api_secret || '', data.access_token || '',
      data.refresh_token || '', data.server_prefix || '',
      data.connected ? 1 : 0, JSON.stringify(data.config || {}), data.platform
    );
    return getIntegrationByPlatform(data.platform!)!;
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO integrations (id, platform, display_name, api_key, api_secret, access_token, refresh_token, server_prefix, connected, config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.platform || '', data.display_name || '', data.api_key || '',
    data.api_secret || '', data.access_token || '', data.refresh_token || '',
    data.server_prefix || '', data.connected ? 1 : 0, JSON.stringify(data.config || {})
  );
  return getIntegrationByPlatform(data.platform!)!;
}

// ==================== SETTINGS ====================

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getSMTPSettings(): SMTPSettings | null {
  const raw = getSetting('smtp');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setSMTPSettings(settings: SMTPSettings): void {
  setSetting('smtp', JSON.stringify(settings));
}

// ==================== EMAIL LOGS ====================

export function getEmailLogs(campaignId?: string, limit = 100): EmailLog[] {
  if (campaignId) {
    return db.prepare('SELECT * FROM email_logs WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ?').all(campaignId, limit) as EmailLog[];
  }
  return db.prepare('SELECT * FROM email_logs ORDER BY created_at DESC LIMIT ?').all(limit) as EmailLog[];
}

export function addEmailLog(log: Partial<EmailLog>): EmailLog {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO email_logs (id, campaign_id, contact_email, contact_name, subject, status, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, log.campaign_id || null, log.contact_email, log.contact_name || '', log.subject || '', log.status || 'pending', log.error || '');
  return db.prepare('SELECT * FROM email_logs WHERE id = ?').get(id) as EmailLog;
}

// ==================== STATS ====================

export function getStats(): CampaignStats {
  const totalCampaigns = (db.prepare('SELECT COUNT(*) as c FROM campaigns').get() as any).c;
  const totalSent = (db.prepare('SELECT COALESCE(SUM(sent_count), 0) as c FROM campaigns').get() as any).c;
  const totalContacts = getContactCount();
  const totalLists = (db.prepare('SELECT COUNT(*) as c FROM email_lists').get() as any).c;
  const recentCampaigns = getCampaigns().slice(0, 5);

  return { totalCampaigns, totalSent, totalContacts, totalLists, recentCampaigns };
}

// ==================== SEED DEFAULT TEMPLATES ====================

export function seedDefaultTemplates(): void {
  const count = (db.prepare('SELECT COUNT(*) as c FROM templates').get() as any).c;
  if (count > 0) return;

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
</div>`
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
</div>`
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
</div>`
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
</div>`
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
</div>`
    }
  ];

  const insert = db.prepare(`
    INSERT INTO templates (id, name, subject, body, category, is_default)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  for (const t of templates) {
    insert.run(uuidv4(), t.name, t.subject, t.body, t.category);
  }
}

// Seed on init
seedDefaultTemplates();
