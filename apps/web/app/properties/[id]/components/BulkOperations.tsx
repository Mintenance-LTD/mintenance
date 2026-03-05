'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Download, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { getCsrfHeaders } from '@/lib/csrf-client';

interface Job {
  id: string;
  title: string;
  status: string;
  amount: number;
  date: string;
  category: string;
}

interface PropertyOption {
  id: string;
  property_name: string;
}

export default function BulkOperations({ propertyId, jobs }: { propertyId: string; jobs: Job[] }) {
  const [exporting, setExporting] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkTitle, setBulkTitle] = useState('');
  const [bulkDesc, setBulkDesc] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showBulkForm && properties.length === 0) {
      fetch('/api/properties')
        .then(res => res.ok ? res.json() : { data: [] })
        .then(data => {
          const list = (data.data || data || []) as PropertyOption[];
          setProperties(list.filter((p: PropertyOption) => p.id !== propertyId));
        })
        .catch(() => {});
    }
  }, [showBulkForm, propertyId, properties.length]);

  const handleExportCompliance = async () => {
    setExporting(true);
    try {
      const completedJobs = jobs.filter(j => j.status === 'completed');
      if (completedJobs.length === 0) {
        toast.error('No completed jobs to export');
        return;
      }

      const headers = ['Title', 'Category', 'Amount (GBP)', 'Date', 'Status'];
      const rows = completedJobs.map(j => [
        `"${j.title.replace(/"/g, '""')}"`,
        j.category,
        j.amount.toFixed(2),
        j.date,
        j.status,
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `property-${propertyId}-compliance-report.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Compliance report downloaded');
    } catch {
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkTitle.trim()) {
      toast.error('Job title is required');
      return;
    }
    const allIds = [propertyId, ...selectedProperties];
    if (allIds.length < 2) {
      toast.error('Select at least one additional property');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getCsrfHeaders() },
        body: JSON.stringify({
          title: bulkTitle.trim(),
          description: bulkDesc.trim() || undefined,
          category: bulkCategory.trim() || undefined,
          propertyIds: allIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Bulk job creation failed');
        return;
      }
      toast.success(`Created ${data.created} jobs${data.failed > 0 ? ` (${data.failed} failed)` : ''}`);
      setShowBulkForm(false);
      setBulkTitle('');
      setBulkDesc('');
      setBulkCategory('');
      setSelectedProperties([]);
    } catch {
      toast.error('Failed to create bulk jobs');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProperty = (id: string) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 border border-gray-200 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-teal-600" />
        <h4 className="text-sm font-semibold text-gray-900">Bulk Operations</h4>
      </div>
      <div className="space-y-2">
        <Link
          href={`/jobs/create?property_id=${propertyId}`}
          className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Post Job for This Property
        </Link>

        <button
          onClick={() => setShowBulkForm(!showBulkForm)}
          className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          Bulk Post to Multiple Properties
        </button>

        {showBulkForm && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <input
              type="text"
              placeholder="Job title"
              value={bulkTitle}
              onChange={e => setBulkTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <textarea
              placeholder="Description (optional)"
              value={bulkDesc}
              onChange={e => setBulkDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">
                Also post to ({selectedProperties.length} selected):
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {properties.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProperties.includes(p.id)}
                      onChange={() => toggleProperty(p.id)}
                      className="rounded"
                    />
                    {p.property_name}
                  </label>
                ))}
                {properties.length === 0 && (
                  <p className="text-xs text-gray-400">No other properties found</p>
                )}
              </div>
            </div>
            <button
              onClick={handleBulkSubmit}
              disabled={submitting}
              className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {submitting ? 'Creating...' : `Create ${1 + selectedProperties.length} Jobs`}
            </button>
          </div>
        )}

        <button
          onClick={handleExportCompliance}
          disabled={exporting}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {exporting ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
          ) : (
            <><Download className="w-3.5 h-3.5 text-gray-500" /> Export Compliance Report</>
          )}
        </button>
        <p className="text-[10px] text-gray-400">
          {jobs.filter(j => j.status === 'completed').length} completed job{jobs.filter(j => j.status === 'completed').length !== 1 ? 's' : ''} available for export
        </p>
      </div>
    </div>
  );
}
