'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Download, Upload, CloudUpload, HardDriveDownload, ShieldCheck,
  ExternalLink, Trash2, RefreshCw, DatabaseBackup, History,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ServerBackup { file: string; size: number; created_at: string; }

const CLOUD_LINKS = [
  { name: 'Google Drive', url: 'https://drive.google.com/drive/my-drive', color: 'from-yellow-500 to-amber-600', desc: 'Open Drive to check uploaded backups' },
  { name: 'Dropbox', url: 'https://www.dropbox.com/home', color: 'from-blue-500 to-blue-700', desc: 'View files synced to your Dropbox' },
  { name: 'OneDrive', url: 'https://onedrive.live.com', color: 'from-sky-500 to-cyan-600', desc: 'Open your OneDrive files' },
];

export default function BackupsPage() {
  const [snapshots, setSnapshots] = useState<ServerBackup[]>([]);
  const [auto, setAuto] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const [s, c, settings] = await Promise.all([
        fetch('/api/backup?list=1').then(r => r.json()),
        fetch('/api/backup/cloud').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      ]);
      setSnapshots(Array.isArray(s) ? s : []);
      setCloudUrl(c.url || '');
      if (settings && typeof settings.auto_backup === 'boolean') setAuto(settings.auto_backup);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const downloadBackup = async () => {
    setBusy('download');
    try {
      const res = await fetch('/api/backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `leafsolar-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast.success('Backup downloaded');
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(null); }
  };

  const createSnapshot = async () => {
    setBusy('snapshot');
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error);
      toast.success('Snapshot saved on server');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(null); }
  };

  const downloadSnapshot = (file: string) => {
    window.open(`/api/backup?file=${encodeURIComponent(file)}`, '_blank');
  };

  const restoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Restoring replaces ALL current data with the backup contents. A safety snapshot of your current data is taken first. Continue?')) {
      e.target.value = '';
      return;
    }
    setRestoring(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch('/api/backup/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error);
      toast.success(`Restored! ${data.counts?.contacts ?? 0} contacts, ${data.counts?.campaigns ?? 0} campaigns`);
      load();
    } catch (err: any) {
      toast.error('Invalid backup file: ' + err.message);
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  const toggleAuto = async () => {
    const next = !auto;
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', key: 'auto_backup', value: next ? 'on' : 'off' }),
    });
    if (res.ok) { setAuto(next); toast.success(next ? 'Auto-backup enabled' : 'Auto-backup disabled'); }
    else toast.error('Failed to update');
  };

  const saveCloudUrl = async () => {
    const res = await fetch('/api/backup/cloud', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cloudUrl }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success('Cloud backup link saved');
  };

  const pushCloud = async () => {
    setBusy('cloud');
    try {
      const res = await fetch('/api/backup/cloud', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'No cloud URL configured');
      toast.success('Backup pushed to your cloud endpoint');
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(null); }
  };

  const fmtSize = (b: number) => b > 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`;

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2.5">
            <DatabaseBackup className="w-8 h-8 text-emerald-600" /> Backups
          </h1>
          <p className="text-gray-500 text-sm">Every contact, campaign, list, template and log — safe and restorable.</p>
        </div>
        <button onClick={createSnapshot} disabled={busy === 'snapshot'}
          className="btn btn-secondary disabled:opacity-60">
          {busy === 'snapshot' ? <div className="spinner !w-4 !h-4" /> : <RefreshCw className="w-4 h-4" />}
          Save snapshot now
        </button>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Backup now */}
        <div className="card p-6">
          <h2 className="font-extrabold text-gray-900 flex items-center gap-2 mb-1">
            <Download className="w-5 h-5 text-emerald-600" /> Download backup
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            A full snapshot of everything you've entered — contacts, lists, campaigns, templates,
            integrations, delivery logs & analytics.
          </p>
          <button onClick={downloadBackup} disabled={busy === 'download'}
            className="btn btn-primary w-full disabled:opacity-60">
            {busy === 'download' ? <div className="spinner !w-5 !h-5" /> : <><Download className="w-4 h-4" /> Download full backup (.json)</>}
          </button>
          <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div>
              <p className="font-semibold text-sm text-gray-800">Automatic backups</p>
              <p className="text-xs text-gray-500">Snapshot after every campaign send & contact import</p>
            </div>
            <button onClick={toggleAuto}
              className={`w-12 h-7 rounded-full transition-colors relative ${auto ? 'bg-emerald-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${auto ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Restore */}
        <div className="card p-6">
          <h2 className="font-extrabold text-gray-900 flex items-center gap-2 mb-1">
            <Upload className="w-5 h-5 text-blue-600" /> Restore from backup
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload a previous backup file to bring back your data. A safety snapshot of current data is
            taken automatically before restoring.
          </p>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={restoreFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={restoring}
            className="btn btn-secondary w-full disabled:opacity-60">
            {restoring ? <div className="spinner !w-5 !h-5" /> : <><Upload className="w-4 h-4" /> Choose a backup file</>}
          </button>
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-2xl p-3">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            Restoring overwrites current data — keep the auto-snapshot for safety.
          </div>
        </div>
      </div>

      {/* Cloud backup */}
      <div className="card p-6">
        <h2 className="font-extrabold text-gray-900 flex items-center gap-2 mb-1">
          <CloudUpload className="w-5 h-5 text-violet-600" /> Cloud backups
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Keep backups off your server too. Connect any webhook URL (e.g. a Zapier Google Drive step) —
          or use the links below to open your cloud storage.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          {CLOUD_LINKS.map(l => (
            <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
              className="group border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${l.color} flex items-center justify-center mb-2 shadow-md`}>
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-sm text-gray-900 group-hover:text-emerald-600 transition-colors">{l.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
            </a>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={cloudUrl} onChange={e => setCloudUrl(e.target.value)}
              placeholder="https://hook.zapier.com/... (optional webhook for auto cloud upload)"
              className="input text-sm" />
            <button onClick={saveCloudUrl} className="btn btn-secondary whitespace-nowrap">Save link</button>
          </div>
          <p className="text-xs text-gray-400">
            Tip: create a <strong>Zapier</strong> webhook that appends JSON payloads to Google Drive or
            Dropbox, paste its URL here, then tap “Send to cloud” — every backup lands in your cloud.
          </p>
          <button onClick={pushCloud} disabled={busy === 'cloud' || !cloudUrl}
            className="btn btn-primary disabled:opacity-60">
            {busy === 'cloud' ? <div className="spinner !w-5 !h-5" /> : <><CloudUpload className="w-4 h-4" /> Send backup to cloud now</>}
          </button>
        </div>
      </div>

      {/* Server snapshots */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" />
          <h2 className="font-extrabold text-gray-900">Saved snapshots on server</h2>
          <span className="ml-auto text-xs text-gray-400">{snapshots.length} kept (max 20)</span>
        </div>
        {snapshots.length === 0 ? (
          <p className="p-10 text-center text-gray-400 text-sm">No server snapshots yet. Hit “Save snapshot now”.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {snapshots.map(s => (
              <div key={s.file} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <HardDriveDownload className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.file}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleString()} · {fmtSize(s.size)}
                  </p>
                </div>
                <button onClick={() => downloadSnapshot(s.file)}
                  className="btn btn-secondary !py-1.5 !px-3 text-xs"><Download className="w-3.5 h-3.5" /> Download</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
