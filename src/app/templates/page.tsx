'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Template } from '@/types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Template | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '', category: 'general' });

  const load = () => {
    fetch('/api/templates').then(r => r.json()).then(data => {
      setTemplates(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newTemplate.name.trim()) { toast.error('Template name required'); return; }
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTemplate),
    });
    toast.success('Template created');
    setNewTemplate({ name: '', subject: '', body: '', category: 'general' });
    setShowCreate(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await fetch('/api/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast.success('Template deleted');
    load();
  };

  const categoryColors: Record<string, string> = {
    promotion: 'bg-red-50 text-red-600',
    announcement: 'bg-blue-50 text-blue-600',
    newsletter: 'bg-purple-50 text-purple-600',
    followup: 'bg-yellow-50 text-yellow-700',
    general: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="animate-fade-in mt-12 lg:mt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Email Templates</h1>
          <p className="text-sm text-gray-500">Pre-built templates for your campaigns</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-green-700 shadow">
          <Plus className="w-5 h-5" /> <span className="hidden sm:inline">New Template</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[t.category] || categoryColors.general}`}>
                    {t.category}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800 mb-1">{t.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{t.subject}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPreview(t)}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreview(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{preview.name}</h2>
                <p className="text-sm text-gray-500">{preview.subject}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 hover:bg-gray-100 rounded-lg text-xl">✕</button>
            </div>
            <div className="overflow-y-auto p-5 flex-1" dangerouslySetInnerHTML={{ __html: preview.body }} />
            <div className="p-4 border-t border-gray-100">
              <Link href="/campaigns/new"
                className="block w-full text-center bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700">
                Use in New Campaign
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold">New Template</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <input value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Template name" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
              <input value={newTemplate.subject} onChange={e => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                placeholder="Default subject" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
              <select value={newTemplate.category} onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none">
                <option value="general">General</option>
                <option value="promotion">Promotion</option>
                <option value="announcement">Announcement</option>
                <option value="newsletter">Newsletter</option>
                <option value="followup">Follow Up</option>
              </select>
              <textarea value={newTemplate.body} onChange={e => setNewTemplate({ ...newTemplate, body: e.target.value })}
                rows={6} placeholder="HTML content (optional)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none resize-none font-mono text-xs" />
              <button onClick={handleCreate}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700">
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
