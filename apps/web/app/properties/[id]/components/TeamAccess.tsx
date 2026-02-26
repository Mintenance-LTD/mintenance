'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
};

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
};

export default function TeamAccess({ propertyId }: { propertyId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'viewer' });

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/team`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleInvite = async () => {
    if (!form.email) {
      toast.error('Email is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => [data.member, ...prev]);
        setForm({ email: '', role: 'viewer' });
        setShowForm(false);
        toast.success('Invitation sent');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to invite');
      }
    } catch {
      toast.error('Failed to invite');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/team?memberId=${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '' },
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== id));
        toast.success('Member removed');
      }
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Team Access</h4>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-200 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Team Access</h4>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
          <input
            type="email"
            placeholder="Email address *"
            value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
          <select
            value={form.role}
            onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="viewer">Viewer — can view property details</option>
            <option value="manager">Manager — can manage jobs and tenants</option>
            <option value="admin">Admin — full access</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={saving}
              className="flex-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Inviting...' : 'Send Invite'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-xs text-gray-500">No team members yet. Invite people to help manage this property.</p>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 truncate">{m.email}</span>
                <button onClick={() => handleRemove(m.id)} className="p-0.5 hover:bg-red-100 rounded ml-2 flex-shrink-0">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${ROLE_BADGES[m.role] || 'bg-gray-100 text-gray-600'}`}>
                  {m.role}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${STATUS_BADGES[m.status] || 'bg-gray-100 text-gray-600'}`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
