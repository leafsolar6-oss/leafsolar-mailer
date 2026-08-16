'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Trash2, Eye, Search, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Template } from '@/types';
import { offlineFetch } from '@/lib/offline';

const CATEGORY_COLORS: Record<string, string> = {
  promotion: 'bg-red-50 text-red-600',
  announcement: 'bg-blue-50 text-blue-600',
  newsletter: 'bg-violet-50 text-violet-600',
  followup: 'bg-amber-50 text-amber-700',
  product: 'bg-sky-50 text-sky-600',
  solar: 'bg-emerald-50 text-emerald-700',
  welcome: 'bg-teal-50 text-teal-600',
  service: 'bg-indigo-50 text-indigo-600',
  seasonal: 'bg-pink-50 text-pink-600',
  trust: 'bg-lime-50 text-lime-700',
  general: 'bg-gray-100 text-gray-600',
};

const CATEGORY_LABELS: Record<string, string> = {
  promotion: 'Promotions',
  product: 'Product Spotlights',
  solar: 'Solar & Packages',
  newsletter: 'Newsletters',
  followup: 'Follow-ups',
  announcement: 'Announcements',
  welcome: 'Welcome',
  service: 'Service & Support',
  seasonal: 'Seasonal',
  trust: 'Trust & Social Proof',
  general: 'General',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Template | null>(null);
  const [show, setShow] = useState(false);
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', subject: '', body: '', category: 'general' });

  const load = () => {
    offlineFetch<Template[]>('/api/templates').then(r => setTemplates(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const okCat = cat === 'all' || t.category === cat;
      const q = search.toLowerCase();
      const okSearch = !q || t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
      return okCat && okSearch;
    });
  }, [templates, cat, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    templates.forEach(t => { map[t.category] = (map[t.category] || 0) + 1; });
    return map;
  }, [templates]);

  const create = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    await offlineFetch('/api/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    toast.success('Template created');
    setForm({ name: '', subject: '', body: '', category: 'general' });
    setShow(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch('/api/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    toast.success('Deleted'); load();
  };

  const cats = Object.keys(counts).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Templates</h1>
          <p className="text-gray-500 text-sm">{templates.length} professional designs — built for Leaf Solar</p>
        </div>
        <button onClick={() => setShow(true)} className="btn btn-primary"><Plus className="w-4 h-4" /> New Template</button>
      </div>

      {/* Search + category filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates by name or subject..."
            className="input !pl-12" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={cat === 'all'} onClick={() => setCat('all')} label={`All (${templates.length})`} />
          {cats.map(c => (
            <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}
              label={`${CATEGORY_LABELS[c] || c} (${counts[c]})`} />
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner" /></div> : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <LayoutGrid className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No templates match that filter.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="card p-5 group hover:shadow-lg transition-all flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <span className={`badge ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.general}`}>
                  {CATEGORY_LABELS[t.category] || t.category}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 leading-snug">{t.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mt-1 mb-4 flex-1">{t.subject}</p>
              <div className="flex gap-2">
                <button onClick={() => setPreview(t)} className="btn btn-secondary !py-1.5 !px-3 text-xs"><Eye className="w-3.5 h-3.5" /> Preview</button>
                <Link href={`/campaigns/new?template=${t.id}`} className="btn btn-primary !py-1.5 !px-3 text-xs">Use</Link>
                <button onClick={() => del(t.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 ml-auto"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreview(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div><h2 className="font-extrabold">{preview.name}</h2><p className="text-sm text-gray-500">{preview.subject}</p></div>
              <button onClick={() => setPreview(null)} className="p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
            </div>
            <div className="overflow-y-auto p-5 flex-1 bg-gray-100" dangerouslySetInnerHTML={{ __html: preview.body }} />
            <div className="p-4 border-t border-gray-100">
              <Link href={`/campaigns/new?template=${preview.id}`} className="btn btn-primary w-full">Use in Campaign</Link>
            </div>
          </div>
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShow(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">New Template</h2>
              <button onClick={() => setShow(false)} className="p-2 hover:bg-gray-100 rounded-xl text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="input" />
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="input" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input">
                {Object.keys(CATEGORY_LABELS).map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={6} placeholder="HTML content" className="input resize-none font-mono text-xs" />
              <button onClick={create} className="btn btn-primary w-full">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
        active
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
      }`}>
      {label}
    </button>
  );
}
