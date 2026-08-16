'use client';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Upload, Search, Plus, Trash2, Users, FileSpreadsheet,
  Download, X, CheckCircle, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Contact } from '@/types';

function ContactsContent() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [pasteEmails, setPasteEmails] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newContact, setNewContact] = useState({ email: '', name: '', company: '', phone: '' });

  const load = useCallback(() => {
    fetch(`/api/contacts?search=${encodeURIComponent(search)}`).then(r => r.json()).then(data => {
      setContacts(data);
      setLoading(false);
    });
  }, [search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get('import') === 'true') setShowImport(true);
  }, [searchParams]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        toast.success(`Imported ${data.success} contacts`);
        load();
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handlePasteImport = async () => {
    const emails = pasteEmails.split(/[\n,;]/).map(e => e.trim()).filter(e => e);
    if (emails.length === 0) { toast.error('No emails found'); return; }
    setImporting(true);
    const contactsData = emails.map(email => ({
      email, name: '', company: '', phone: '', source: 'paste-import', tags: ['pasted']
    }));
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: contactsData }),
      });
      const data = await res.json();
      setImportResult(data);
      toast.success(`Imported ${data.success} contacts`);
      setPasteEmails('');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.email) { toast.error('Email required'); return; }
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newContact),
    });
    toast.success('Contact added');
    setNewContact({ email: '', name: '', company: '', phone: '' });
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await fetch('/api/contacts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast.success('Contact deleted');
    load();
  };

  const exportCSV = () => {
    const headers = 'Email,Name,Company,Phone,Source,Date\n';
    const rows = contacts.map(c =>
      `"${c.email}","${c.name}","${c.company}","${c.phone}","${c.source}","${c.created_at}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leafsolar-contacts-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in mt-12 lg:mt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contacts</h1>
          <p className="text-sm text-gray-500">{contacts.length} total contacts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 text-sm">
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 text-sm">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts by email, name, or company..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No contacts found. Import or add contacts to get started.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700">
              <Upload className="w-5 h-5" /> Import Contacts
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Company</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Source</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-medium text-gray-800">{c.name || '(no name)'}</p>
                      <p className="text-gray-500 text-xs">{c.email}</p>
                    </td>
                    <td className="p-3 text-gray-600 hidden md:table-cell">{c.company || '—'}</td>
                    <td className="p-3 hidden sm:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.source}</span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(c.id)}
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowImport(false); setImportResult(null); }} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-800">Import Contacts</h2>
              <button onClick={() => { setShowImport(false); setImportResult(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {importResult ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Import Complete!</h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 p-3 rounded-xl">
                      <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                      <p className="text-xs text-gray-500">Imported</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-xl">
                      <p className="text-2xl font-bold text-yellow-600">{importResult.duplicates || 0}</p>
                      <p className="text-xs text-gray-500">Duplicates</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl">
                      <p className="text-2xl font-bold text-red-600">{importResult.failed || 0}</p>
                      <p className="text-xs text-gray-500">Failed</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowImport(false); setImportResult(null); }}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-green-700">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* File Upload */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" /> Upload File
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">Supports CSV, Excel (.xlsx), TXT, and VCF files</p>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.txt,.vcf"
                      onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50">
                      {importing ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="spinner" />
                          <span className="text-sm text-gray-500">Importing...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Upload className="w-10 h-10" />
                          <span className="text-sm font-medium">Tap to select file</span>
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-400">OR</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Paste Emails */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Paste Email Addresses</h3>
                    <p className="text-sm text-gray-500 mb-2">One per line, or separated by commas</p>
                    <textarea value={pasteEmails} onChange={e => setPasteEmails(e.target.value)}
                      rows={5} placeholder="john@example.com&#10;jane@company.com&#10;..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none" />
                    <button onClick={handlePasteImport} disabled={importing || !pasteEmails.trim()}
                      className="w-full mt-3 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50">
                      Import Pasted Emails
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Add Contact</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                  type="email" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input value={newContact.company} onChange={e => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <button onClick={handleAddContact}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 mt-2">
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" /></div>}>
      <ContactsContent />
    </Suspense>
  );
}
