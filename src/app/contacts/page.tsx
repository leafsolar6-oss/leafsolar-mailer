'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, Search, Plus, Trash2, Users, FileSpreadsheet, Download, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Contact } from '@/types';
import { offlineFetch } from '@/lib/offline';

function ContactsContent() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [paste, setPaste] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ email: '', name: '', company: '', phone: '' });

  const load = () => {
    offlineFetch<Contact[]>(`/api/contacts?search=${encodeURIComponent(search)}`)
      .then(r => setContacts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [search]);
  useEffect(() => { if (searchParams.get('import') === 'true') setShowImport(true); }, [searchParams]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) { setResult(data); toast.success(`Imported ${data.success}`); load(); }
      else toast.error(data.error);
    } catch (err: any) { toast.error(err.message); }
    finally { setImporting(false); }
  };

  const pasteImport = async () => {
    const emails = paste.split(/[\n,;]/).map(s => s.trim()).filter(Boolean);
    if (!emails.length) return toast.error('No emails found');
    setImporting(true);
    const { data } = await offlineFetch('/api/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: emails.map(email => ({ email, source: 'paste-import', tags: ['pasted'] })) }),
    });
    setResult(data);
    setPaste('');
    toast.success(`Imported ${(data as any).success}`);
    setImporting(false);
    load();
  };

  const addContact = async () => {
    if (!form.email) return toast.error('Email required');
    await offlineFetch('/api/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    toast.success('Contact added');
    setForm({ email: '', name: '', company: '', phone: '' });
    setShowAdd(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await fetch('/api/contacts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    toast.success('Deleted');
    load();
  };

  const exportCsv = () => {
    const hdr = 'Email,Name,Company,Phone,Source,Date\n';
    const rows = contacts.map(c => `"${c.email}","${c.name}","${c.company}","${c.phone}","${c.source}","${c.created_at}"`).join('\n');
    const blob = new Blob([hdr + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leafsolar-contacts-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm">{contacts.length} total contacts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn btn-secondary !px-3"><Download className="w-4 h-4" /></button>
          <button onClick={() => setShowImport(true)} className="btn btn-secondary"><Upload className="w-4 h-4" /> Import</button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by email, name, or company..."
          className="input !pl-12" />
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner" /></div>
       : contacts.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No contacts found. Import or add some.</p>
          <button onClick={() => setShowImport(true)} className="btn btn-primary"><Upload className="w-4 h-4" /> Import Contacts</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-4 font-semibold">Contact</th>
                  <th className="text-left p-4 font-semibold hidden md:table-cell">Company</th>
                  <th className="text-left p-4 font-semibold hidden sm:table-cell">Source</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">{c.name || '(no name)'}</p>
                      <p className="text-gray-500 text-xs">{c.email}</p>
                    </td>
                    <td className="p-4 text-gray-600 hidden md:table-cell">{c.company || '—'}</td>
                    <td className="p-4 hidden sm:table-cell"><span className="badge bg-gray-100 text-gray-600">{c.source}</span></td>
                    <td className="p-4 text-right">
                      <button onClick={() => del(c.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowImport(false); setResult(null); }} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-extrabold">Import Contacts</h2>
              <button onClick={() => { setShowImport(false); setResult(null); }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {result ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-extrabold mb-4">Import Complete</h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <Stat label="Imported" value={result.success} color="text-emerald-600" />
                    <Stat label="Duplicates" value={result.duplicates || 0} color="text-amber-600" />
                    <Stat label="Failed" value={result.failed || 0} color="text-red-600" />
                  </div>
                  <button onClick={() => { setShowImport(false); setResult(null); }} className="btn btn-primary w-full">Done</button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="font-bold mb-2 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Upload File</h3>
                    <p className="text-sm text-gray-500 mb-3">CSV, Excel (.xlsx), TXT, or VCF</p>
                    <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt,.vcf" onChange={upload} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} disabled={importing}
                      className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                      {importing ? <div className="spinner mx-auto" /> : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Upload className="w-8 h-8" />
                          <span className="text-sm font-semibold">Tap to select file</span>
                        </div>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300 text-sm"><div className="flex-1 h-px bg-gray-200" />OR<div className="flex-1 h-px bg-gray-200" /></div>
                  <div>
                    <h3 className="font-bold mb-2">Paste Emails</h3>
                    <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={5}
                      placeholder="One per line or comma-separated"
                      className="input resize-none text-sm" />
                    <button onClick={pasteImport} disabled={importing || !paste.trim()}
                      className="btn btn-primary w-full mt-3">Import Pasted Emails</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Add Contact</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              {(['email', 'name', 'company', 'phone'] as const).map(f => (
                <div key={f}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 capitalize">{f}</label>
                  <input value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                    type={f === 'email' ? 'email' : 'text'} className="input" />
                </div>
              ))}
              <button onClick={addContact} className="btn btn-primary w-full mt-2">Add Contact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 p-3 rounded-xl">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="spinner" /></div>}>
      <ContactsContent />
    </Suspense>
  );
}
