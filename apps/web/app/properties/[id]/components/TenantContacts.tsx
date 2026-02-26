'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Plus, Trash2, Loader2, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lease_start: string | null;
  lease_end: string | null;
  notes: string | null;
  is_active: boolean;
}

export default function TenantContacts({ propertyId }: { propertyId: string }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', lease_start: '', lease_end: '', notes: '' });

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/tenants`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleAdd = async () => {
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(prev => [data.tenant, ...prev]);
        setForm({ name: '', email: '', phone: '', lease_start: '', lease_end: '', notes: '' });
        setShowForm(false);
        toast.success('Tenant added');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add');
      }
    } catch {
      toast.error('Failed to add tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/tenants?tenantId=${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '' },
      });
      if (res.ok) {
        setTenants(prev => prev.filter(t => t.id !== id));
        toast.success('Tenant removed');
      }
    } catch {
      toast.error('Failed to remove');
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  if (loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Tenant & Contact Records</h4>
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
          <User className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Tenant & Contact Records</h4>
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
            type="text"
            placeholder="Tenant name *"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">Lease Start</label>
              <input
                type="date"
                value={form.lease_start}
                onChange={e => setForm(prev => ({ ...prev, lease_start: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">Lease End</label>
              <input
                type="date"
                value={form.lease_end}
                onChange={e => setForm(prev => ({ ...prev, lease_end: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Tenant'}
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

      {tenants.length === 0 ? (
        <p className="text-xs text-gray-500">No tenants recorded. Add tenants to track contact details and lease dates.</p>
      ) : (
        <div className="space-y-2">
          {tenants.map(t => (
            <div key={t.id} className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{t.name}</span>
                <button onClick={() => handleDelete(t.id)} className="p-0.5 hover:bg-red-100 rounded">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-gray-500">
                {t.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {t.email}
                  </span>
                )}
                {t.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {t.phone}
                  </span>
                )}
              </div>
              {(t.lease_start || t.lease_end) && (
                <div className="mt-1 text-[10px] text-gray-400">
                  Lease: {formatDate(t.lease_start)} — {formatDate(t.lease_end)}
                </div>
              )}
              {t.notes && <div className="mt-1 text-[10px] text-gray-400 italic">{t.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
