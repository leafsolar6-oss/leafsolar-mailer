'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Plus, Trash2, Search, Users, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Contact, EmailList } from '@/types';
import { offlineFetch } from '@/lib/offline';

function ListDetailContent() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const [list, setList] = useState<EmailList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [paste, setPaste] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [lists, members, all] = await Promise.all([
        offlineFetch<EmailList[]>('/api/lists'),
        offlineFetch<Contact[]>(`/api/contacts?listId=${listId}`),
        offlineFetch<Contact[]>('/api/contacts'),
      ]);
      setList(lists.data.find(l => l.id === listId) || null);
      setContacts(members.data);
      setAllContacts(all.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [listId]);

  const filtered = contacts.filter(c =>
    !search || c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const notInList = allContacts.filter(c => !contacts.some(m => m.id === c.id));

  const addExisting = async (contactIds: string[]) => {
    const r = await fetch('/api/lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addContacts', listId, contactIds }),
    });
    if (r.ok) { toast.success('Added'); load(); }
    else toast.error('Failed');
  };

  const removeContacts = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Remove ${ids.length} contact(s) from this list?`)) return;
    const r = await fetch('/api/lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'removeContacts', listId, contactIds: ids }),
    });
    if (r.ok) { toast.success('Removed'); setSelected(new Set()); load(); }
    else toast.error('Failed');
  };

  const importPaste = async () => {
    const emails = paste.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (!emails.length) return toast.error('No emails found');
    setImporting(true);
    const r = await fetch('/api/lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'importContacts', listId,
        contacts: emails.map(email => ({ email, source: 'list-import' })),
      }),
    });
    const data = await r.json();
    setImporting(false);
    if (r.ok) {
      setResult(data); setPaste(''); toast.success(`Imported ${data.success}`);
      load();
    } else toast.error(data.error);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('listId', listId);
    const r = await fetch('/api/import', { method: 'POST', body: fd });
    const data = await r.json();
    setImporting(false);
    if (r.ok) { setResult(data); toast.success(`Imported ${data.success}`); load(); }
    else toast.error(data.error);
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!list) return <div className="card p-8 text-center text-gray-500">List not found.</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/lists')} className="p-2 rounded-xl hover:bg-black/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-900">{list.name}</h1>
          <p className="text-sm text-gray-500">{list.description || 'Manage contacts in this list'}</p>
        </div>
        <span className="badge bg-emerald-50 text-emerald-700">
          <Users className="w-3 h-3" /> {contacts.length} contacts
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setShowImport(true)} className="btn btn-primary">
          <Upload className="w-4 h-4" /> Import to list
        </button>
        <button onClick={() => setShowAdd(true)} className="btn btn-secondary">
          <Plus className="w-4 h-4" /> Add existing
        </button>
        {selected.size > 0 && (
          <button onClick={() => removeContacts(Array.from(selected))} className="btn btn-danger">
            <Trash2 className="w-4 h-4" /> Remove ({selected.size})
          </button>
        )}
      </div>

      {result && (
        <div className="card p-4 bg-emerald-50 border-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div className="text-sm">
            <span className="font-semibold text-emerald-800">Import complete:</span>{' '}
            <span className="text-emerald-700">{result.success} added, {result.duplicates || 0} duplicates</span>
          </div>
          <button onClick={() => setResult(null)} className="ml-auto text-emerald-600 text-xl leading-none">×</button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts in this list..." className="input !pl-10" />
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No contacts in this list yet.</p>
            <button onClick={() => setShowImport(true)} className="btn btn-primary mt-4">
              <Upload className="w-4 h-4" /> Import contacts
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="text-left p-4">Contact</th>
                <th className="text-left p-4 hidden md:table-cell">Company</th>
                <th className="text-left p-4 hidden sm:table-cell">Source</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)}
                      className="w-4 h-4 rounded text-emerald-600" />
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-gray-900">{c.name || '(no name)'}</p>
                    <p className="text-gray-500 text-xs">{c.email}</p>
                  </td>
                  <td className="p-4 text-gray-600 hidden md:table-cell">{c.company || '—'}</td>
                  <td className="p-4 hidden sm:table-cell"><span className="badge bg-gray-100 text-gray-600">{c.source}</span></td>
                  <td className="p-4 text-right">
                    <button onClick={() => removeContacts([c.id])}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Remove from list">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showImport && (
        <Modal title={`Import into "${list.name}"`} onClose={() => setShowImport(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Upload CSV / Excel / TXT / VCF</label>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt,.vcf"
                onChange={uploadFile} className="input" />
            </div>
            <div className="text-center text-gray-400 text-sm">— or —</div>
            <div>
              <label className="block text-sm font-semibold mb-2">Paste emails</label>
              <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={5}
                placeholder="one@example.com&#10;two@example.com" className="input resize-none" />
            </div>
            <button onClick={importPaste} disabled={importing} className="btn btn-primary w-full">
              {importing ? <div className="spinner !w-4 !h-4" /> : <Upload className="w-4 h-4" />}
              Import to list
            </button>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="Add existing contacts" onClose={() => setShowAdd(false)}>
          {notInList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">All contacts are already in this list.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notInList.map(c => (
                <button key={c.id} onClick={() => addExisting([c.id])}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-left border border-gray-100">
                  <div>
                    <p className="font-semibold text-sm">{c.name || '(no name)'}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-600" />
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-extrabold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ListDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" /></div>}>
      <ListDetailContent />
    </Suspense>
  );
}
