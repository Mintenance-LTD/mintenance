'use client';

import React, { useState } from 'react';
import {
  Plus,
  RefreshCw,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Property {
  id: string;
  property_name: string;
  address: string;
}

interface Schedule {
  id: string;
  property_id: string;
  task_type: string;
  title: string;
  description: string | null;
  category: string;
  frequency: string;
  next_due_date: string;
  last_completed_date: string | null;
  auto_create_job: boolean;
  is_active: boolean;
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 months',
  annual: 'Annually',
};

const TASK_TYPES = [
  'Gas Safety Check',
  'EICR Inspection',
  'Boiler Service',
  'Gutter Cleaning',
  'Fire Alarm Test',
  'Legionella Assessment',
  'Garden Maintenance',
  'Chimney Sweep',
  'Pest Inspection',
  'General Inspection',
] as const;

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function RecurringTasksClient({
  properties,
  schedules: initialSchedules,
}: {
  properties: Property[];
  schedules: Schedule[];
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    property_id: '',
    task_type: 'General Inspection',
    title: '',
    description: '',
    frequency: 'annual',
    next_due_date: '',
    auto_create_job: false,
  });

  const getPropertyName = (id: string) =>
    properties.find(p => p.id === id)?.property_name || 'Unknown';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id || !formData.title.trim() || !formData.next_due_date) return;

    try {
      const res = await fetch('/api/landlord/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      const { schedule } = await res.json();
      setSchedules(prev => [...prev, schedule].sort(
        (a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime(),
      ));
      setShowForm(false);
      setFormData({ property_id: '', task_type: 'General Inspection', title: '', description: '', frequency: 'annual', next_due_date: '', auto_create_job: false });
      toast.success('Recurring task created');
    } catch {
      toast.error('Failed to create task');
    }
  };

  const overdue = schedules.filter(s => s.is_active && daysUntil(s.next_due_date) < 0);
  const upcoming = schedules.filter(s => s.is_active && daysUntil(s.next_due_date) >= 0 && daysUntil(s.next_due_date) <= 30);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Tasks</h1>
          <p className="mt-1 text-gray-500">Schedule maintenance tasks on a regular cycle.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">{overdue.length} overdue task{overdue.length > 1 ? 's' : ''}</p>
            <p className="text-sm text-red-600">
              {overdue.map(s => s.title).join(', ')}
            </p>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">{upcoming.length} task{upcoming.length > 1 ? 's' : ''} due within 30 days</p>
          </div>
        </div>
      )}

      {/* New Task Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">New Recurring Task</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                required
                value={formData.property_id}
                onChange={e => setFormData(p => ({ ...p, property_id: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
              </select>
              <select
                value={formData.task_type}
                onChange={e => setFormData(p => ({ ...p, task_type: e.target.value, title: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <input
              required
              type="text"
              placeholder="Task title"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={formData.frequency}
                onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <input
                required
                type="date"
                value={formData.next_due_date}
                onChange={e => setFormData(p => ({ ...p, next_due_date: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.auto_create_job}
                onChange={e => setFormData(p => ({ ...p, auto_create_job: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Automatically create a job when due
            </label>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Create Task
            </button>
          </form>
        </div>
      )}

      {/* Schedule List */}
      {schedules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recurring tasks</h3>
          <p className="text-gray-500">Set up recurring maintenance to stay on top of compliance.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map(schedule => {
            const days = daysUntil(schedule.next_due_date);
            const isOverdue = days < 0;
            const isDueSoon = days >= 0 && days <= 30;

            return (
              <div
                key={schedule.id}
                className={`bg-white rounded-xl border p-4 ${isOverdue ? 'border-red-200' : isDueSoon ? 'border-amber-200' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isOverdue ? 'bg-red-50 text-red-600' : isDueSoon ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {isOverdue ? <AlertTriangle className="w-4 h-4" /> :
                       isDueSoon ? <Clock className="w-4 h-4" /> :
                       <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{schedule.title}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{getPropertyName(schedule.property_id)}</span>
                        <span>{FREQUENCY_LABELS[schedule.frequency]}</span>
                        {schedule.auto_create_job && (
                          <span className="text-blue-600">Auto-job</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-600'}`}>
                      {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(schedule.next_due_date).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
