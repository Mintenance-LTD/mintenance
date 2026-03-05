'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfToken } from '@/lib/csrf-client';

interface Schedule {
  id: string;
  title: string;
  category: string | null;
  frequency: string;
  next_due_date: string;
  is_active: boolean;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: 'bg-purple-100 text-purple-700',
  monthly: 'bg-blue-100 text-blue-700',
  quarterly: 'bg-amber-100 text-amber-700',
  yearly: 'bg-green-100 text-green-700',
};

export default function RecurringMaintenance({ propertyId }: { propertyId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', frequency: 'monthly', next_due_date: '' });

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/recurring-maintenance`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handleAdd = async () => {
    if (!form.title || !form.next_due_date) {
      toast.error('Title and next due date are required');
      return;
    }
    setSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/recurring-maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(prev => [...prev, data.schedule]);
        setForm({ title: '', category: '', frequency: 'monthly', next_due_date: '' });
        setShowForm(false);
        toast.success('Schedule added');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add');
      }
    } catch {
      toast.error('Failed to add schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/recurring-maintenance?scheduleId=${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) {
        setSchedules(prev => prev.filter(s => s.id !== id));
        toast.success('Schedule removed');
      }
    } catch {
      toast.error('Failed to remove');
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/recurring-maintenance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ scheduleId: id, is_active: !currentActive }),
      });
      if (res.ok) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentActive } : s));
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const isDueSoon = (date: string) => {
    const due = new Date(date);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000 && diff > 0;
  };

  const isOverdue = (date: string) => new Date(date) < new Date();

  if (loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Recurring Maintenance</h4>
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
          <Calendar className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Recurring Maintenance</h4>
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
            placeholder="e.g. Boiler service"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
          <input
            type="text"
            placeholder="Category (optional)"
            value={form.category}
            onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.frequency}
              onChange={e => setForm(prev => ({ ...prev, frequency: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input
              type="date"
              value={form.next_due_date}
              onChange={e => setForm(prev => ({ ...prev, next_due_date: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Schedule'}
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

      {schedules.length === 0 ? (
        <p className="text-xs text-gray-500">No recurring schedules yet. Add one to track regular maintenance.</p>
      ) : (
        <div className="space-y-2">
          {schedules.map(s => (
            <div key={s.id} className={`p-2.5 rounded-lg border text-xs ${!s.is_active ? 'bg-gray-50 border-gray-100 opacity-60' : isOverdue(s.next_due_date) ? 'bg-red-50 border-red-200' : isDueSoon(s.next_due_date) ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{s.title}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggle(s.id, s.is_active)} className="text-[10px] text-gray-400 hover:text-gray-600">
                    {s.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-0.5 hover:bg-red-100 rounded">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${FREQUENCY_COLORS[s.frequency] || 'bg-gray-100 text-gray-600'}`}>
                  {FREQUENCY_LABELS[s.frequency] || s.frequency}
                </span>
                <span className={`text-[10px] ${isOverdue(s.next_due_date) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {isOverdue(s.next_due_date) ? 'Overdue' : 'Due'}: {new Date(s.next_due_date).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
