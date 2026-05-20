'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  FileText,
  MessageSquare,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';

interface Report {
  id: string;
  reporter_name: string;
  reporter_phone: string | null;
  reporter_email: string | null;
  reporter_unit: string | null;
  category: string;
  description: string;
  urgency: string;
  status: string;
  landlord_notes: string | null;
  created_at: string;
  properties: { id: string; property_name: string; address: string } | null;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-800' },
  acknowledged: {
    label: 'Acknowledged',
    className: 'bg-amber-100 text-amber-800',
  },
  converted: { label: 'Job Created', className: 'bg-green-100 text-green-800' },
  resolved: { label: 'Resolved', className: 'bg-gray-100 text-gray-800' },
  dismissed: { label: 'Dismissed', className: 'bg-red-100 text-red-700' },
};

const URGENCY_COLORS: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-amber-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export function TenantReportsClient({
  reports: initialReports,
}: {
  reports: Report[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [updating, setUpdating] = useState(false);

  const filtered =
    filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  const counts = {
    all: reports.length,
    new: reports.filter((r) => r.status === 'new').length,
    acknowledged: reports.filter((r) => r.status === 'acknowledged').length,
  };

  // Optimistic status update — same flow as the Mint Editorial port.
  // Lives in both clients so default-theme users can also Acknowledge
  // / Resolve / Dismiss / Reopen tenant reports.
  const updateStatus = async (
    report: Report,
    nextStatus: string,
    closeAfter = true
  ) => {
    if (updating) return;
    setUpdating(true);
    const previous = report.status;
    const optimistic: Report = { ...report, status: nextStatus };
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? optimistic : r))
    );
    setSelectedReport(optimistic);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/landlord/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      const { report: fresh } = (await res.json()) as { report: Report };
      setReports((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)));
      toast.success('Status updated');
      if (closeAfter) setSelectedReport(null);
    } catch (err) {
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: previous } : r))
      );
      setSelectedReport((prev) =>
        prev && prev.id === report.id ? { ...prev, status: previous } : prev
      );
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className='max-w-5xl mx-auto px-4 sm:px-6 py-8'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-gray-900'>Tenant Reports</h1>
        <p className='mt-1 text-gray-500'>
          Maintenance issues reported by tenants via anonymous reporting links.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className='flex gap-2 mb-6 overflow-x-auto'>
        {(
          [
            'all',
            'new',
            'acknowledged',
            'converted',
            'resolved',
            'dismissed',
          ] as const
        ).map((tab) => (
          <button
            key={tab}
            type='button'
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'all' ? 'All' : STATUS_BADGES[tab]?.label || tab}
            {tab === 'all' && counts.all > 0 && ` (${counts.all})`}
            {tab === 'new' && counts.new > 0 && ` (${counts.new})`}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className='text-center py-16 bg-white rounded-xl border border-gray-200'>
          <MessageSquare className='w-12 h-12 text-gray-300 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-gray-900 mb-2'>
            {filter === 'all' ? 'No reports yet' : `No ${filter} reports`}
          </h3>
          <p className='text-gray-500'>
            {filter === 'all'
              ? 'Share a reporting link with your tenants to receive maintenance reports.'
              : 'Try a different filter to see reports.'}
          </p>
        </div>
      )}

      {/* Report List */}
      <div className='space-y-3'>
        {filtered.map((report) => {
          const badge = STATUS_BADGES[report.status] || STATUS_BADGES.new;
          return (
            <button
              key={report.id}
              type='button'
              onClick={() => setSelectedReport(report)}
              className='w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm hover:border-gray-300 transition-all'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span
                      className={`text-xs font-medium capitalize ${URGENCY_COLORS[report.urgency] || ''}`}
                    >
                      {report.urgency}
                    </span>
                  </div>
                  <p className='font-medium text-gray-900 truncate'>
                    {report.category.replace(/_/g, ' ')} —{' '}
                    {report.reporter_name}
                    {report.reporter_unit && ` (${report.reporter_unit})`}
                  </p>
                  <p className='text-sm text-gray-500 truncate mt-0.5'>
                    {report.description}
                  </p>
                  {report.properties && (
                    <p className='text-xs text-gray-400 mt-1'>
                      {report.properties.property_name}
                    </p>
                  )}
                </div>
                <div className='text-xs text-gray-400 whitespace-nowrap'>
                  {new Date(report.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto'>
            <div className='flex items-center justify-between p-4 border-b border-gray-100'>
              <h3 className='font-semibold text-gray-900'>Report Details</h3>
              <button
                type='button'
                onClick={() => setSelectedReport(null)}
                className='text-gray-400 hover:text-gray-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-4 space-y-4'>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Reporter</p>
                <p className='font-medium'>{selectedReport.reporter_name}</p>
                {selectedReport.reporter_unit && (
                  <p className='text-sm text-gray-500'>
                    Unit: {selectedReport.reporter_unit}
                  </p>
                )}
                {selectedReport.reporter_phone && (
                  <p className='text-sm text-gray-500'>
                    Phone: {selectedReport.reporter_phone}
                  </p>
                )}
                {selectedReport.reporter_email && (
                  <p className='text-sm text-gray-500'>
                    Email: {selectedReport.reporter_email}
                  </p>
                )}
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Category & Urgency</p>
                <p className='capitalize'>
                  {selectedReport.category.replace(/_/g, ' ')} —{' '}
                  <span
                    className={URGENCY_COLORS[selectedReport.urgency] || ''}
                  >
                    {selectedReport.urgency}
                  </span>
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-500 mb-1'>Description</p>
                <p className='text-sm text-gray-800 whitespace-pre-wrap'>
                  {selectedReport.description}
                </p>
              </div>
              {selectedReport.properties && (
                <div>
                  <p className='text-xs text-gray-500 mb-1'>Property</p>
                  <p className='text-sm'>
                    {selectedReport.properties.property_name}
                  </p>
                  <p className='text-xs text-gray-400'>
                    {selectedReport.properties.address}
                  </p>
                </div>
              )}
              <div>
                <p className='text-xs text-gray-500 mb-1'>Submitted</p>
                <p className='text-sm'>
                  {new Date(selectedReport.created_at).toLocaleString('en-GB')}
                </p>
              </div>
              {/* Status mutation row — buttons depend on the current
                  state. Audit fix (2026-05-12): the filter tabs implied
                  the user could change a report's status, but there
                  was no UI to actually do it. Now wired through the
                  new PATCH /api/landlord/reports/[id] route. */}
              <div className='flex flex-wrap gap-2 pt-2'>
                {selectedReport.status === 'new' && (
                  <>
                    <button
                      type='button'
                      disabled={updating}
                      onClick={() =>
                        updateStatus(selectedReport, 'acknowledged', false)
                      }
                      className='inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors'
                    >
                      <CheckCircle2 className='w-4 h-4' />
                      Acknowledge
                    </button>
                    <button
                      type='button'
                      disabled={updating}
                      onClick={() => updateStatus(selectedReport, 'dismissed')}
                      className='inline-flex items-center gap-2 border border-gray-300 text-gray-700 rounded-lg py-2 px-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors'
                    >
                      <XCircle className='w-4 h-4' />
                      Dismiss
                    </button>
                  </>
                )}
                {selectedReport.status === 'acknowledged' && (
                  <>
                    <button
                      type='button'
                      disabled={updating}
                      onClick={() => updateStatus(selectedReport, 'resolved')}
                      className='inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors'
                    >
                      <CheckCircle2 className='w-4 h-4' />
                      Mark resolved
                    </button>
                    <button
                      type='button'
                      disabled={updating}
                      onClick={() => updateStatus(selectedReport, 'dismissed')}
                      className='inline-flex items-center gap-2 border border-gray-300 text-gray-700 rounded-lg py-2 px-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors'
                    >
                      <XCircle className='w-4 h-4' />
                      Dismiss
                    </button>
                  </>
                )}
                {(selectedReport.status === 'resolved' ||
                  selectedReport.status === 'dismissed') && (
                  <button
                    type='button'
                    disabled={updating}
                    onClick={() => updateStatus(selectedReport, 'new')}
                    className='inline-flex items-center gap-2 border border-gray-300 text-gray-700 rounded-lg py-2 px-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors'
                  >
                    <RotateCcw className='w-4 h-4' />
                    Reopen
                  </button>
                )}
              </div>
              <div className='flex gap-2 pt-2'>
                {selectedReport.properties &&
                selectedReport.status !== 'converted' &&
                selectedReport.status !== 'dismissed' ? (
                  <a
                    href={`/jobs/create?property_id=${selectedReport.properties.id}&category=${selectedReport.category}&description=${encodeURIComponent(selectedReport.description)}`}
                    className='flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-blue-700 transition-colors'
                  >
                    <FileText className='w-4 h-4' />
                    Create Job
                  </a>
                ) : null}
                <button
                  type='button'
                  onClick={() => setSelectedReport(null)}
                  className='px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
