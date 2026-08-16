/**
 * Backups — everything the user inputs is captured in the JSON store, so a
 * backup is a single JSON file containing the whole database (contacts,
 * lists, campaigns, templates, integrations, settings, delivery logs and
 * tracking events).
 *
 * - Manual: download a fresh backup any time, or create a dated snapshot on
 *   the server (kept in ./data/backups, pruned to the last N).
 * - Automatic: a snapshot is written after every bulk campaign send and
 *   contact import when the "auto backup" setting is on.
 * - Restore: upload a previous backup file; the store is replaced (a safety
 *   snapshot of the current data is taken first).
 * - Cloud: the same payload can be POSTed to a webhook URL (e.g. a Zapier
 *   "Google Drive" step, Dropbox, or your own endpoint), and the UI links
 *   straight to Drive/Dropbox/OneDrive.
 */
import fs from 'fs';
import path from 'path';
import store from './store';

export interface BackupMeta {
  app: string;
  version: string;
  created_at: string;
  counts: Record<string, number>;
}

export interface BackupPayload {
  meta: BackupMeta;
  data: unknown;
}

const MAX_SERVER_BACKUPS = 20;
const AUTO_BACKUP_KEY = 'auto_backup'; // 'on' | 'off'

export function backupDir(): string {
  // On Vercel serverless, process.cwd() is read-only — only the DATABASE_PATH
  // directory (e.g. /tmp on Vercel) is writable. Snapshots live next to the
  // database file so they work on any platform.
  const base = process.env.DATABASE_PATH
    ? path.dirname(process.env.DATABASE_PATH.replace(/\.db$/, '.json'))
    : path.join(process.cwd(), 'data');
  const dir = path.join(base, 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function isAutoBackupEnabled(): boolean {
  return store.settings.get(AUTO_BACKUP_KEY) === 'on';
}

export function setAutoBackupEnabled(on: boolean): void {
  store.settings.set(AUTO_BACKUP_KEY, on ? 'on' : 'off');
}

export function createBackupPayload(): BackupPayload {
  const db = store.raw;
  const counts: Record<string, number> = {
    contacts: db.contacts.length,
    lists: db.email_lists.length,
    campaigns: db.campaigns.length,
    templates: db.templates.length,
    integrations: db.integrations.length,
    email_logs: db.email_logs.length,
    tracking_events: db.tracking_events.length,
  };
  return {
    meta: {
      app: 'leafsolar-mailer',
      version: '1.1.0',
      created_at: new Date().toISOString(),
      counts,
    },
    data: db,
  };
}

/** Writes a dated snapshot to ./data/backups and prunes old ones. */
export function writeBackupFile(): string {
  const payload = createBackupPayload();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(backupDir(), `backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  pruneServerBackups();
  return file;
}

export interface ServerBackup {
  file: string;
  size: number;
  created_at: string;
}

export function listServerBackups(): ServerBackup[] {
  if (!fs.existsSync(backupDir())) return [];
  return fs.readdirSync(backupDir())
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .map(f => {
      const full = path.join(backupDir(), f);
      const stat = fs.statSync(full);
      return {
        file: f,
        size: stat.size,
        created_at: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function readServerBackupFile(fileName: string): string | null {
  const safe = path.basename(fileName);
  const full = path.join(backupDir(), safe);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf-8');
}

function pruneServerBackups(): void {
  const backups = listServerBackups();
  for (const b of backups.slice(MAX_SERVER_BACKUPS)) {
    try {
      fs.unlinkSync(path.join(backupDir(), b.file));
    } catch {
      /* ignore */
    }
  }
}

/** Replaces the store with a previously exported backup payload. */
export function restoreFromPayload(payload: unknown): { ok: boolean; error?: string; counts?: Record<string, number> } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid backup file' };
  }
  const p = payload as Partial<BackupPayload>;
  const data = p.data;
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Backup file has no data section' };
  }
  const db = data as Record<string, unknown>;
  for (const key of ['contacts', 'email_lists', 'list_contacts', 'campaigns', 'templates', 'integrations', 'settings', 'email_logs', 'tracking_events', 'outbox']) {
    if (db[key] !== undefined && !Array.isArray(db[key]) && typeof db[key] !== 'object') {
      return { ok: false, error: `Backup has an invalid "${key}" section` };
    }
  }
  const next = store.replace(db as never);
  return {
    ok: true,
    counts: {
      contacts: next.contacts.length,
      lists: next.email_lists.length,
      campaigns: next.campaigns.length,
      email_logs: next.email_logs.length,
    },
  };
}

/** Posts a fresh backup to a configured cloud webhook URL. */
export async function pushToCloudBackup(url: string): Promise<{ ok: boolean; error?: string }> {
  const payload = createBackupPayload();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return { ok: false, error: `Cloud endpoint responded ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
