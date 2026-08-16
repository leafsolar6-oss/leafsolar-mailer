'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, ListChecks, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { EmailList } from '@/types';
import { offlineFetch } from '@/lib/offline';

export default function ListsPage() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => {
    offlineFetch<EmailList[]>('/api/lists').then(r => setLists(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    await offlineFetch('/api/lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    toast.success('List created');
    setForm({ name: '', description: '' });
    setShow(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this list?')) return;
    await fetch('/api/lists', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast.success('Deleted');
    load();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Email Lists</h1>
          <p className="text-gray-500 text-sm">Organize contacts into targeted segments</p>
        </div>
        <button onClick={() => setShow(true)} className="btn btn-primary"><Plus className="w-4 h-4" /> New List</button>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner" /></div>
       : lists.length === 0 ? (
        <div className="card p-16 text-center">
          <ListChecks className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No lists yet</p>
          <button onClick={() => setShow(true)} className="btn btn-primary"><Plus className="w-4 h-4" /> Create First List</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(l => (
            <Link key={l.id} href={`/lists/${l.id}`} className="card p-5 group block hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <button onClick={(e) => { e.preventDefault(); del(l.id); }} className="p-2 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-emerald-600">{l.name}</h3>
              {l.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{l.description}</p>}
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600">{l.contact_count}</span>
                <span className="text-sm text-gray-400">contacts · tap to manage →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShow(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">New Email List</h2>
              <button onClick={() => setShow(false)} className="p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">List Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Residential Leads" className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} className="input resize-none" />
              </div>
              <button onClick={create} className="btn btn-primary w-full">Create List</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
