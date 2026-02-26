'use client';

import React, { useState } from 'react';
import { Layers, Plus, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  status: string;
  amount: number;
  date: string;
  category: string;
}

export default function BulkOperations({ propertyId, jobs }: { propertyId: string; jobs: Job[] }) {
  const [exporting, setExporting] = useState(false);

  const handleExportCompliance = async () => {
    setExporting(true);
    try {
      // Build CSV from completed jobs
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
