'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Upload, Search, Plus, Trash2, Users, FileSpreadsheet, Download, X,
  CheckCircle2, ListPlus, ListX, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Contact, EmailList } from '@/types';
import { offlineFetch } from '@/lib/offline';

interface ContactFormState {
  id?: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  list_ids: string[];
}

const EMPTY_FORM: ContactFormState = { email: '', name: '', company: '', phone: '', list_ids: [] };

function ContactsContent() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [listNames, setListNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [paste, setPaste] = useState('');
  const [importListId, setImportListId] = useState('');
  const [listModal, setListModal] = useState<{ mode: 'add' | 'remove' } | null>(null);
  const [bulkListId, setBulkListId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    offlineFetch<Contact[]>(`/api/contacts?search=${encodeURIComponent(search)}&includeLists=1`)
      .then(r => setContacts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [search]);

  useEffect(() => {
    offlineFetch<EmailList[]>('/api/lists')
      .then(r => {
        setLists(r.data);
        const map: Record<string, string> = {};
        r.data.forEach(l => { map[l.id] = l.name; });
        setListNames(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get('import') === 'true') setShowImport(true);
  }, [searchParams]);

  // ----- selection helpers -----
  const allVisibleSelected = contacts.length > 0 && selected.size === contacts.length;
  const toggleAll = () => {
    setSelected(prev => allVisibleSelected ? new Set() : new Set(contacts.map(c => c.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ----- bulk actions -----
  const exportSelected = () => {
    const target = selected.size ? contacts.filter(c => selected.has(c.id)) : contacts;
    const hdr = 'Email,Name,Company,Phone,Source,Lists,Status,Date\n';
    const rows = target.map(c => {
      const listNamesStr = (c.list_ids || []).map(id => listNames[id] || id).join('; ');
      return [c.email, c.name, c.company, c.phone, c.source, listNamesStr, c.status, c.created_at]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    const blob = new Blob([hdr + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leafsolar-contacts-${Date.now()}.csv`;
    a.click();
  };

  const applyBulkList = async () => {
    if (!bulkListId) return toast.error('Choose a list first');
    const ids = [...selected];
    const body = listModal?.mode === 'add'
      ? { action: 'addContacts', listId: bulkListId, contactIds: ids }
      : { action: 'removeContacts', listId: bulkListId, contactIds: ids };
    const res = await fetch('/api/lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(listModal?.mode === 'add'
        ? `Added ${data.count ?? ids.length} contact(s) to list`
        : `Removed ${data.removed ?? ids.length} contact(s) from list`);
      setListModal(null);
      setBulkListId('');
      setSelected(new Set());
      load();
    } else toast.error(data.error);
  };

  const deleteSelected = async (idsOverride?: string[]) => {
    const ids = idsOverride && idsOverride.length ? idsOverride : [...selected];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} contact(s)? This also removes them from all lists.`)) return;
    const res = await fetch('/api/contacts', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (res.ok) { toast.success(`Deleted ${data.removed} contact(s)`); setSelected(new Set()); load(); }
    else toast.error(data.error);
  };

  // ----- add / edit contact -----
  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowAdd(true); };
  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ id: c.id, email: c.email, name: c.name, company: c.company, phone: c.phone, list_ids: c.list_ids || [] });
    setShowAdd(true);
  };

  const saveContact = async () => {
    if (!form.email.trim()) return toast.error('Email required');
    const payload = {
      email: form.email, name: form.name, company: form.company,
      phone: form.phone, list_ids: form.list_ids,
    };
    const res = await fetch(editing ? '/api/contacts' : '/api/contacts', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success(editing ? 'Contact updated' : 'Contact added');
    setShowAdd(false);
    load();
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    if (importListId) fd.append('listId', importListId);
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
    const res = await fetch('/api/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts: emails.map(email => ({ email, source: 'paste-import', tags: ['pasted'] })),
        list_ids: importListId ? [importListId] : [],
      }),
    });
    const data = await res.json();
    setResult(data);
    setPaste('');
    toast.success(`Imported ${(data as any).success}`);
    setImporting(false);
    load();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm">{contacts.length} total contacts{selected.size > 0 && ` · ${selected.size} selected`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportSelected} className="btn btn-secondary !px-3" title="Export CSV">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setShowImport(true)} className="btn btn-secondary">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={openAdd} className="btn btn-primary"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by email, name, or company..."
          className="input !pl-12" />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="card p-3 flex items-center gap-2 flex-wrap bg-emerald-50/60 border-emerald-200 animate-fade-in">
          <span className="text-sm font-bold text-emerald-800 px-2">{selected.size} selected</span>
          <div className="flex-1" />
          <button onClick={() => { setListModal({ mode: 'add' }); setBulkListId(''); }}
            className="btn btn-secondary !py-2 !px-3 !text-xs"><ListPlus className="w-4 h-4" /> Add to list</button>
          <button onClick={() => { setListModal({ mode: 'remove' }); setBulkListId(''); }}
            className="btn btn-secondary !py-2 !px-3 !text-xs"><ListX className="w-4 h-4" /> Remove from list</button>
          <button onClick={exportSelected} className="btn btn-secondary !py-2 !px-3 !text-xs"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => deleteSelected()} className="btn btn-danger !py-2 !px-3 !text-xs"><Trash2 className="w-4 h-4" /> Delete</button>
        </div>
      )}

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
                  <th className="p-4 w-10">
                    <input type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      title="Select all"
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                  </th>
                  <th className="text-left p-4 font-semibold">Contact</th>
                  <th className="text-left p-4 font-semibold hidden md:table-cell">Company</th>
                  <th className="text-left p-4 font-semibold hidden lg:table-cell">Lists</th>
                  <th className="text-left p-4 font-semibold hidden sm:table-cell">Source</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map(c => {
                  const checked = selected.has(c.id);
                  const memberLists = (c.list_ids || []).map(id => listNames[id]).filter(Boolean);
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50 ${checked ? 'bg-emerald-50/40' : ''}`}>
                      <td className="p-4">
                        <input type="checkbox" checked={checked} onChange={() => toggleOne(c.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-900">{c.name || '(no name)'}</p>
                        <p className="text-gray-500 text-xs">{c.email}</p>
                        {c.status !== 'active' && (
                          <span className={`badge mt-1 ${c.status === 'unsubscribed' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                            {c.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 hidden md:table-cell">{c.company || '—'}</td>
                      <td className="p-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {memberLists.length === 0 ? (
                            <span className="text-xs text-gray-300">—</span>
                          ) : memberLists.slice(0, 3).map(name => (
                            <span key={name} className="badge bg-emerald-50 text-emerald-700">{name}</span>
                          ))}
                          {memberLists.length > 3 && (
                            <span className="badge bg-gray-100 text-gray-500">+{memberLists.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell"><span className="badge bg-gray-100 text-gray-600">{c.source}</span></td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(c)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteSelected([c.id])}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 bg-gray-50/50 flex items-center gap-2">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}
              className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer" />
            Select all {contacts.length} contact(s) on this page
          </div>
        </div>
      )}

      {/* Bulk add/remove list modal */}
      {listModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setListModal(null)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                {listModal.mode === 'add' ? <ListPlus className="w-5 h-5 text-emerald-600" /> : <ListX className="w-5 h-5 text-red-500" />}
                {listModal.mode === 'add' ? 'Add to list' : 'Remove from list'}
              </h2>
              <button onClick={() => setListModal(null)} className="p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">{selected.size} contact(s) selected</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Choose a list</label>
                <select value={bulkListId} onChange={e => setBulkListId(e.target.value)}
                  className="input">
                  <option value="">— Select list —</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.contact_count})</option>
                  ))}
                </select>
              </div>
              {lists.length === 0 && (
                <p className="text-sm text-amber-600">No lists yet — create one on the Lists page first.</p>
              )}
              <button onClick={applyBulkList} disabled={!bulkListId}
                className="btn btn-primary w-full disabled:opacity-50">
                {listModal.mode === 'add' ? 'Add to list' : 'Remove from list'}
              </button>
            </div>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Add to list (optional)</label>
                    <select value={importListId} onChange={e => setImportListId(e.target.value)} className="input">
                      <option value="">— No list —</option>
                      {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
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
              <h2 className="text-lg font-extrabold">{editing ? 'Edit Contact' : 'Add Contact'}</h2>
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Add to lists</label>
                {lists.length === 0 ? (
                  <p className="text-xs text-gray-400">No lists yet. Create one on the Lists page.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-2">
                    {lists.map(l => {
                      const on = form.list_ids.includes(l.id);
                      return (
                        <label key={l.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={on}
                            onChange={() => setForm(prev => ({
                              ...prev,
                              list_ids: on ? prev.list_ids.filter(id => id !== l.id) : [...prev.list_ids, l.id],
                            }))}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
                          <span className="text-sm text-gray-700 flex-1">{l.name}</span>
                          <span className="text-xs text-gray-400">{l.contact_count}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <button onClick={saveContact} className="btn btn-primary w-full mt-2">
                {editing ? 'Save Changes' : 'Add Contact'}
              </button>
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
