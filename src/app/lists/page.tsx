'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, ListChecks, Users, X, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { EmailList } from '@/types';

export default function ListsPage() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newList, setNewList] = useState({ name: '', description: '' });

  const load = () => {
    fetch('/api/lists').then(r => r.json()).then(data => {
      setLists(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newList.name.trim()) { toast.error('List name required'); return; }
    await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newList),
    });
    toast.success('List created');
    setNewList({ name: '', description: '' });
    setShowCreate(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this list? Contacts will not be deleted.')) return;
    await fetch('/api/lists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast.success('List deleted');
    load();
  };

  return (
    <div className="animate-fade-in mt-12 lg:mt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Email Lists</h1>
          <p className="text-sm text-gray-500">Organize contacts into targeted lists</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-green-700 shadow">
          <Plus className="w-5 h-5" /> <span className="hidden sm:inline">New List</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : lists.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
          <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No email lists yet</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700">
            <Plus className="w-5 h-5" /> Create First List
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <div key={list.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <button onClick={() => handleDelete(list.id)}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-gray-800">{list.name}</h3>
              {list.description && <p className="text-sm text-gray-500 mt-1">{list.description}</p>}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-2xl font-bold text-green-600">{list.contact_count}</span>
                <span className="text-sm text-gray-400">contacts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold flex items-center gap-2"><FolderPlus className="w-5 h-5 text-green-600" /> New Email List</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">List Name *</label>
                <input value={newList.name} onChange={e => setNewList({ ...newList, name: e.target.value })}
                  placeholder="e.g., Residential Leads"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={newList.description} onChange={e => setNewList({ ...newList, description: e.target.value })}
                  rows={3} placeholder="What is this list for?"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none resize-none" />
              </div>
              <button onClick={handleCreate}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700">
                Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
