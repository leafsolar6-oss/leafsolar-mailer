/**
 * Lightweight JSON-file data store.
 *
 * Why not SQLite? better-sqlite3 is a native module that does not load on
 * Vercel's serverless functions (it crashes every API route with a 500).
 * This store uses only Node built-ins (fs/path) so it runs everywhere —
 * locally, on Vercel, or on a VPS.
 *
 * Storage location:
 *   - Vercel/serverless: /tmp/leafsolar-data.json  (ephemeral per instance)
 *   - Local/VPS:          ./data/leafsolar-data.json (persistent)
 *
 * NOTE on Vercel: /tmp is ephemeral and not shared across invocations, so
 * data may reset between cold starts. For durable production storage, hook
 * this up to Vercel Postgres/KV or any external database. The store is
 * intentionally simple to make that swap straightforward.
 */
import fs from 'fs';
import path from 'path';
import type {
  Contact, EmailList, Campaign, Template, Integration,
  EmailLog, SMTPSettings,
} from '@/types';

interface DBShape {
  contacts: Contact[];
  email_lists: EmailList[];
  list_contacts: { list_id: string; contact_id: string }[];
  campaigns: Campaign[];
  templates: Template[];
  integrations: Integration[];
  settings: Record<string, string>;
  email_logs: EmailLog[];
}

function emptyDB(): DBShape {
  return {
    contacts: [],
    email_lists: [],
    list_contacts: [],
    campaigns: [],
    templates: [],
    integrations: [],
    settings: {},
    email_logs: [],
  };
}

function dbFilePath(): string {
  const configured = process.env.DATABASE_PATH;
  // If someone explicitly pointed at an .db file, map to a sibling .json.
  if (configured) {
    if (configured.endsWith('.db')) return configured.replace(/\.db$/, '.json');
    return configured;
  }
  // Default: local persistent file.
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'leafsolar-data.json');
}

const FILE = dbFilePath();
let cache: DBShape | null = null;

function load(): DBShape {
  if (cache) return cache;
  let next: DBShape;
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Partial<DBShape>;
      // Backfill any missing top-level keys
      next = { ...emptyDB(), ...parsed };
    } else {
      next = emptyDB();
    }
  } catch {
    next = emptyDB();
  }
  cache = next;
  return next;
}

function persist() {
  if (!cache) return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  } catch {
    // On read-only filesystems we keep in-memory state.
  }
}

const store = {
  get raw(): DBShape {
    return load();
  },

  // ---------------- contacts ----------------
  contacts: {
    all(): Contact[] {
      return load().contacts.slice().sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
      );
    },
    byId(id: string): Contact | undefined {
      return load().contacts.find(c => c.id === id);
    },
    byEmail(email: string): Contact | undefined {
      const e = email.toLowerCase().trim();
      return load().contacts.find(c => c.email?.toLowerCase() === e);
    },
    add(c: Contact): void {
      const db = load();
      db.contacts.push(c);
      persist();
    },
    remove(id: string): void {
      const db = load();
      db.contacts = db.contacts.filter(c => c.id !== id);
      db.list_contacts = db.list_contacts.filter(lc => lc.contact_id !== id);
      persist();
    },
  },

  // ---------------- lists ----------------
  lists: {
    all(): EmailList[] {
      return load().email_lists.slice().sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
      );
    },
    byId(id: string): EmailList | undefined {
      return load().email_lists.find(l => l.id === id);
    },
    add(l: EmailList): void {
      load().email_lists.push(l);
      persist();
    },
    remove(id: string): void {
      const db = load();
      db.email_lists = db.email_lists.filter(l => l.id !== id);
      db.list_contacts = db.list_contacts.filter(lc => lc.list_id !== id);
      persist();
    },
    update(id: string, patch: Partial<EmailList>): void {
      const db = load();
      const l = db.email_lists.find(x => x.id === id);
      if (l) Object.assign(l, patch);
      persist();
    },
    contactIds(listId: string): string[] {
      return load().list_contacts.filter(lc => lc.list_id === listId).map(lc => lc.contact_id);
    },
    addContacts(listId: string, contactIds: string[]): number {
      const db = load();
      let count = 0;
      for (const cid of contactIds) {
        if (!db.list_contacts.some(lc => lc.list_id === listId && lc.contact_id === cid)) {
          db.list_contacts.push({ list_id: listId, contact_id: cid });
          count++;
        }
      }
      const total = db.list_contacts.filter(lc => lc.list_id === listId).length;
      const l = db.email_lists.find(x => x.id === listId);
      if (l) l.contact_count = total;
      persist();
      return count;
    },
  },

  // ---------------- campaigns ----------------
  campaigns: {
    all(): Campaign[] {
      return load().campaigns.slice().sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
      );
    },
    byId(id: string): Campaign | undefined {
      return load().campaigns.find(c => c.id === id);
    },
    add(c: Campaign): void {
      load().campaigns.push(c);
      persist();
    },
    update(id: string, patch: Partial<Campaign>): void {
      const db = load();
      const c = db.campaigns.find(x => x.id === id);
      if (c) {
        Object.assign(c, patch, { updated_at: new Date().toISOString() });
        persist();
      }
    },
    remove(id: string): void {
      const db = load();
      db.campaigns = db.campaigns.filter(c => c.id !== id);
      persist();
    },
  },

  // ---------------- templates ----------------
  templates: {
    all(): Template[] {
      const db = load();
      return db.templates.slice().sort((a, b) => {
        if ((b.is_default ? 1 : 0) !== (a.is_default ? 1 : 0)) {
          return (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0);
        }
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
    },
    byId(id: string): Template | undefined {
      return load().templates.find(t => t.id === id);
    },
    add(t: Template): void {
      load().templates.push(t);
      persist();
    },
    remove(id: string): void {
      const db = load();
      db.templates = db.templates.filter(t => t.id !== id);
      persist();
    },
  },

  // ---------------- integrations ----------------
  integrations: {
    all(): Integration[] {
      return load().integrations.slice().sort((a, b) => {
        const ai = a.connected ? 1 : 0, bi = b.connected ? 1 : 0;
        if (ai !== bi) return bi - ai;
        return a.display_name.localeCompare(b.display_name);
      });
    },
    byPlatform(platform: string): Integration | undefined {
      return load().integrations.find(i => i.platform === platform);
    },
    upsert(i: Integration): void {
      const db = load();
      const idx = db.integrations.findIndex(x => x.platform === i.platform);
      if (idx >= 0) db.integrations[idx] = i;
      else db.integrations.push(i);
      persist();
    },
  },

  // ---------------- settings ----------------
  settings: {
    get(key: string): string | undefined {
      return load().settings[key];
    },
    set(key: string, value: string): void {
      load().settings[key] = value;
      persist();
    },
    getSMTP(): SMTPSettings | null {
      const raw = this.get('smtp');
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    setSMTP(s: SMTPSettings): void {
      this.set('smtp', JSON.stringify(s));
    },
  },

  // ---------------- email logs ----------------
  logs: {
    all(campaignId?: string, limit = 100): EmailLog[] {
      let rows = load().email_logs.slice();
      if (campaignId) rows = rows.filter(l => l.campaign_id === campaignId);
      rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return rows.slice(0, limit);
    },
    add(l: EmailLog): void {
      load().email_logs.push(l);
      persist();
    },
  },
};

export default store;
