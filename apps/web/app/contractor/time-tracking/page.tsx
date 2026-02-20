'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  Briefcase,
  TrendingUp,
  Download,
  Loader2,
  X,
  PoundSterling,
} from 'lucide-react';
import { BarChart, DonutChart } from '@tremor/react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface TimeEntry {
  id: string;
  jobId: string | null;
  jobTitle: string;
  taskDescription: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number; // minutes
  hourlyRate: number;
  isBillable: boolean;
  status: 'running' | 'stopped' | 'invoiced';
}

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add form state
  const [formTask, setFormTask] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('17:00');
  const [formHourlyRate, setFormHourlyRate] = useState('50');
  const [formBillable, setFormBillable] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contractor/time-tracking', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch time entries');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      logger.error('Error fetching time entries:', error, { service: 'app' });
      toast.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const resetForm = () => {
    setFormTask('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStartTime('09:00');
    setFormEndTime('17:00');
    setFormHourlyRate('50');
    setFormBillable(true);
    setFormNotes('');
  };

  const calculateDurationMinutes = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const handleAddEntry = async () => {
    if (!formTask.trim()) { toast.error('Task description is required'); return; }
    const duration = calculateDurationMinutes(formStartTime, formEndTime);
    if (duration <= 0) { toast.error('End time must be after start time'); return; }

    setSubmitting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/contractor/time-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          taskDescription: formTask.trim(),
          date: formDate,
          startTime: formStartTime,
          endTime: formEndTime,
          durationMinutes: duration,
          hourlyRate: parseFloat(formHourlyRate) || 0,
          isBillable: formBillable,
          notes: formNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add entry');
      toast.success('Time entry added');
      setShowAddModal(false);
      resetForm();
      fetchEntries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this time entry?')) return;
    const prev = entries;
    setEntries(entries.filter((e) => e.id !== id));
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/contractor/time-tracking?id=${id}`, {
        method: 'DELETE',
        headers: csrfHeaders,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Entry deleted');
    } catch {
      setEntries(prev);
      toast.error('Failed to delete entry');
    }
  };

  const handleExportCSV = () => {
    if (entries.length === 0) { toast.error('No entries to export'); return; }
    const header = 'Date,Job,Task,Start,End,Duration (h),Rate (\u00A3/h),Earnings (\u00A3),Billable,Status\n';
    const rows = entries.map((e) => {
      const hours = (e.duration / 60).toFixed(2);
      const earnings = ((e.duration / 60) * e.hourlyRate).toFixed(2);
      return `${e.date},"${e.jobTitle}","${e.taskDescription}",${e.startTime},${e.endTime || ''},${hours},${e.hourlyRate},${earnings},${e.isBillable ? 'Yes' : 'No'},${e.status}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-entries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const stats = useMemo(() => {
    const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
    const billableMinutes = entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.duration, 0);
    const totalEarnings = entries.reduce((sum, e) => sum + (e.duration / 60) * e.hourlyRate, 0);
    const invoicedEarnings = entries.filter((e) => e.status === 'invoiced').reduce((sum, e) => sum + (e.duration / 60) * e.hourlyRate, 0);
    return {
      totalHours: totalMinutes / 60,
      billableHours: billableMinutes / 60,
      totalEarnings,
      invoicedEarnings,
      pendingEarnings: totalEarnings - invoicedEarnings,
    };
  }, [entries]);

  const timeByJob = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      const job = entry.jobTitle || 'No Job';
      acc[job] = (acc[job] || 0) + entry.duration / 60;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped).map(([job, hours]) => ({
      job,
      hours: parseFloat(hours.toFixed(2)),
    })).sort((a, b) => b.hours - a.hours);
  }, [entries]);

  const dailyBreakdown = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
      const dayEntries = entries.filter((e) => e.date === dateStr);
      const totalMin = dayEntries.reduce((s, e) => s + e.duration, 0);
      const billableMin = dayEntries.filter((e) => e.isBillable).reduce((s, e) => s + e.duration, 0);
      days.push({
        day: dayName,
        billable: parseFloat((billableMin / 60).toFixed(2)),
        nonBillable: parseFloat(((totalMin - billableMin) / 60).toFixed(2)),
      });
    }
    return days;
  }, [entries]);

  if (loading) {
    return (
      <div className="min-h-0 bg-gray-50 flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-gray-50">
      {/* Header */}
      <MotionDiv initial="hidden" animate="visible" variants={fadeIn} className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
              <p className="text-gray-600 mt-1">Track your time and maximise billable hours</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-5 h-5" /> Export
              </button>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
                <Plus className="w-5 h-5" /> Add Entry
              </button>
            </div>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <MotionDiv variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <Clock className="w-5 h-5 text-teal-600 mb-2" />
            <p className="text-sm text-gray-600">Total Hours</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}h</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <TrendingUp className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-sm text-gray-600">Billable Hours</p>
            <p className="text-2xl font-bold text-gray-900">{stats.billableHours.toFixed(1)}h</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <Briefcase className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900">{'\u00A3'}{stats.totalEarnings.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <PoundSterling className="w-5 h-5 text-purple-600 mb-2" />
            <p className="text-sm text-gray-600">Invoiced</p>
            <p className="text-2xl font-bold text-gray-900">{'\u00A3'}{stats.invoicedEarnings.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <Clock className="w-5 h-5 text-yellow-600 mb-2" />
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-gray-900">{'\u00A3'}{stats.pendingEarnings.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</p>
          </MotionDiv>
        </MotionDiv>

        {/* Charts */}
        {entries.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Hours (Last 7 Days)</h3>
              <BarChart data={dailyBreakdown} index="day" categories={['billable', 'nonBillable']} colors={['teal', 'gray']} valueFormatter={(v) => `${v}h`} className="h-60" stack={true} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Time by Job</h3>
              <DonutChart data={timeByJob} category="hours" index="job" valueFormatter={(v) => `${v}h`} colors={['teal', 'blue', 'green', 'purple', 'orange']} className="h-60" />
            </div>
          </div>
        )}

        {/* Entries */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Time Entries</h3>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{entry.jobTitle}</h4>
                    <p className="text-sm text-gray-600 mt-1">{entry.taskDescription}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(entry.date).toLocaleDateString('en-GB')}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{entry.startTime} - {entry.endTime || 'Running'}</span>
                      <span className="font-medium text-gray-900">{formatDuration(entry.duration)}</span>
                      {entry.isBillable && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">Billable</span>}
                      {entry.status === 'invoiced' && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">Invoiced</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {entry.isBillable && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Earnings</p>
                        <p className="text-lg font-bold text-gray-900">{'\u00A3'}{((entry.duration / 60) * entry.hourlyRate).toFixed(2)}</p>
                      </div>
                    )}
                    <button onClick={() => handleDeleteEntry(entry.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {entries.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No time entries</h3>
                <p className="text-gray-600">Add your first time entry to start tracking</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Time Entry</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Description *</label>
                <input type="text" value={formTask} onChange={(e) => setFormTask(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Cabinet installation" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ({'\u00A3'})</label>
                  <input type="number" step="0.01" min="0" value={formHourlyRate} onChange={(e) => setFormHourlyRate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formBillable} onChange={(e) => setFormBillable(e.target.checked)} className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500" />
                    <span className="text-sm font-medium text-gray-700">Billable</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
              <button onClick={handleAddEntry} disabled={submitting} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Entry
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
