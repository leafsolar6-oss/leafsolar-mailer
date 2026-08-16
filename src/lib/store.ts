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
 * Durable mirroring on serverless: the whole store is mirrored to any
 * configured external store (hydrated on cold start, flushed after writes):
 *   - Upstash Redis / Vercel KV (KV_REST_API_URL + KV_REST_API_TOKEN)
 *   - Supabase Postgres REST (SUPABASE_URL + SUPABASE_SERVICE_KEY)
 * Both can be configured at once; reads pull from the first that has data.
 */
import fs from 'fs';
import path from 'path';
import { after } from 'next/server';
import { kvConfigured, kvGet, kvPut } from './kv-persist';
import { supabaseConfigured, supabaseGet, supabasePut } from './supabase-persist';
import type {
  Contact, EmailList, Campaign, Template, Integration,
  EmailLog, SMTPSettings, OutboxItem, TrackingEvent,
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
  tracking_events: TrackingEvent[];
  outbox: OutboxItem[];
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
    tracking_events: [],
    outbox: [],
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

// --- Vercel KV mirroring -----------------------------------------------------
// Hooks run once the store is ready (after hydrate on cold starts) so things
// like template seeding can re-apply over KV data idempotently.
const READY_HOOKS: Array<() => void> = [];
export function onStoreReady(fn: () => void): void {
  READY_HOOKS.push(fn);
}

let hydrated = false;
let hydrateStarted = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function runReadyHooks(): void {
  for (const fn of READY_HOOKS) {
    try { fn(); } catch { /* non-fatal */ }
  }
}

function writeFile(): void {
  if (!cache) return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  } catch {
    // On read-only filesystems we keep in-memory state.
  }
}

/** Any durable store configured? (Vercel KV / Upstash Redis, or Supabase.) */
function anyPersistConfigured(): boolean {
  return kvConfigured() || supabaseConfigured();
}

/** Pulls the latest snapshot from the first configured store that has one. */
async function pullSnapshot(): Promise<string | null> {
  if (kvConfigured()) {
    try { const v = await kvGet(); if (v) return v; } catch { /* try next */ }
  }
  if (supabaseConfigured()) {
    try { const v = await supabaseGet(); if (v) return v; } catch { /* try next */ }
  }
  return null;
}

/** Mirrors the snapshot to every configured durable store. */
function pushSnapshot(value: string): void {
  if (kvConfigured()) kvPut(value).catch(() => { /* unavailable */ });
  if (supabaseConfigured()) supabasePut(value).catch(() => { /* unavailable */ });
}

/** Push of the whole store (skipped until hydrated so a cold-start seed never
 *  overwrites the durable snapshot). Runs AFTER the response via Next's
 *  after() — on Vercel serverless a setTimeout may never fire because the
 *  function is frozen once the response is sent. Falls back to a debounced
 *  timer outside a request context (local dev / scripts). */
let flushScheduled = false;
function scheduleFlush(): void {
  if (!anyPersistConfigured() || !hydrated) return;
  if (flushScheduled) return;
  flushScheduled = true;
  const doFlush = () => {
    flushScheduled = false;
    if (!cache) return;
    pushSnapshot(JSON.stringify(cache));
  };
  try {
    after(doFlush);
  } catch {
    // Outside a request context — use a debounced timer instead.
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(doFlush, 800);
  }
}

let readyPromise: Promise<void> | null = null;

/** Hydrates the store from the durable store (once). Resolves when ready. */
function hydrate(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (!anyPersistConfigured()) {
        hydrated = true;
        return;
      }
      try {
        const raw = await pullSnapshot();
        if (raw) {
          let parsed: Partial<DBShape> = {};
          try { parsed = JSON.parse(raw); } catch { /* invalid snapshot */ }
          cache = { ...emptyDB(), ...parsed };
          writeFile();
          runReadyHooks(); // re-seed any templates missing from the snapshot
        }
        // Snapshot empty -> keep current cache (already seeded); flush persists it.
      } catch {
        // Durable store unavailable — fall back to in-memory/file store.
      } finally {
        hydrated = true;
        scheduleFlush();
      }
    })();
  }
  return readyPromise;
}

/** Await before reading/writing the store on cold starts so the first request
 *  sees KV data (otherwise the first request can race hydration). */
export function whenStoreReady(): Promise<void> {
  return hydrate();
}

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
  writeFile();
  runReadyHooks();
  if (!hydrateStarted) {
    hydrateStarted = true;
    void hydrate();
  }
  return next;
}

function persist() {
  if (!cache) return;
  writeFile();
  scheduleFlush();
}

const store = {
  get raw(): DBShape {
    return load();
  },

  /** Replaces the entire database (used by backup restore). Merges with the
   *  empty shape so any missing collections from an older backup are backfilled. */
  replace(next: Partial<DBShape>): DBShape {
    cache = { ...emptyDB(), ...next };
    persist();
    return cache;
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
    update(id: string, patch: Partial<Contact>): void {
      const db = load();
      const c = db.contacts.find(x => x.id === id);
      if (c) Object.assign(c, patch, { updated_at: new Date().toISOString() });
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
    removeContacts(listId: string, contactIds: string[]): number {
      const db = load();
      const removeSet = new Set(contactIds);
      const before = db.list_contacts.length;
      db.list_contacts = db.list_contacts.filter(
        lc => !(lc.list_id === listId && removeSet.has(lc.contact_id))
      );
      const removed = before - db.list_contacts.length;
      const total = db.list_contacts.filter(lc => lc.list_id === listId).length;
      const l = db.email_lists.find(x => x.id === listId);
      if (l) l.contact_count = total;
      persist();
      return removed;
    },
    /** Ids of every list a contact belongs to. */
    contactListIds(contactId: string): string[] {
      return load().list_contacts.filter(lc => lc.contact_id === contactId).map(lc => lc.list_id);
    },
    /** Replaces the full list membership of a contact (removes from others). */
    setContactLists(contactId: string, listIds: string[]): void {
      const db = load();
      const keep = new Set(listIds);
      db.list_contacts = db.list_contacts.filter(lc => lc.contact_id !== contactId || keep.has(lc.list_id));
      for (const listId of listIds) {
        if (!db.list_contacts.some(lc => lc.list_id === listId && lc.contact_id === contactId)) {
          db.list_contacts.push({ list_id: listId, contact_id: contactId });
        }
      }
      // Refresh contact_count on affected lists.
      for (const l of db.email_lists) {
        l.contact_count = db.list_contacts.filter(lc => lc.list_id === l.id).length;
      }
      persist();
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

  // ---------------- outbox (offline queue) ----------------
  outbox: {
    all(): OutboxItem[] {
      return load().outbox.slice().sort((a, b) =>
        (a.created_at || '').localeCompare(b.created_at || '')
      );
    },
    add(item: OutboxItem): void {
      load().outbox.push(item);
      persist();
    },
    remove(id: string): void {
      const db = load();
      db.outbox = db.outbox.filter(o => o.id !== id);
      persist();
    },
    clear(): void {
      load().outbox = [];
      persist();
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
    byTrackingId(trackingId: string): EmailLog | undefined {
      return load().email_logs.find(l => l.tracking_id === trackingId);
    },
    update(id: string, patch: Partial<EmailLog>): void {
      const db = load();
      const l = db.email_logs.find(x => x.id === id);
      if (l) Object.assign(l, patch);
      persist();
    },
  },

  // ---------------- tracking events ----------------
  events: {
    all(logId?: string, limit = 500): TrackingEvent[] {
      let rows = load().tracking_events.slice();
      if (logId) rows = rows.filter(e => e.log_id === logId);
      rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return rows.slice(0, limit);
    },
    add(e: TrackingEvent): void {
      load().tracking_events.push(e);
      persist();
    },
  },
};

export default store;
