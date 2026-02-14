'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Settings,
  CreditCard,
  FileText,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

// ---------------------------------------------------------------------------
// Types -- matches audit_logs DB table
// ---------------------------------------------------------------------------
interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  status: 'success' | 'failure' | 'warning';
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  stats: {
    total: number;
    success: number;
    failure: number;
    warning: number;
  };
}

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------
interface AuditFilters {
  search: string;
  action: string;
  status: string;
  dateRange: string;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
async function fetchAuditLogs(filters: AuditFilters): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  params.set('limit', '100');
  if (filters.search) params.set('search', filters.search);
  if (filters.action !== 'all') params.set('action', filters.action);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.dateRange !== 'all') params.set('dateRange', filters.dateRange);

  const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Failed to fetch audit logs (${response.status})`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'LOGIN_FAILED', label: 'Failed Logins' },
  { value: 'UPDATE_SETTINGS', label: 'Settings Changes' },
  { value: 'DELETE_USER', label: 'User Deletions' },
  { value: 'REFUND_PAYMENT', label: 'Refunds' },
  { value: 'VIEW_USER', label: 'User Views' },
  { value: 'UPDATE_CONTRACTOR', label: 'Contractor Updates' },
  { value: 'RESOLVE_DISPUTE', label: 'Dispute Resolutions' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'warning', label: 'Warning' },
] as const;

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getStatusColor(status: AuditLog['status']): string {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failure':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getStatusIcon(status: AuditLog['status']): React.ReactNode {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'failure':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    default:
      return <FileText className="w-4 h-4 text-gray-600" />;
  }
}

function getActionIcon(action: string): React.ReactNode {
  if (action.includes('SETTINGS')) return <Settings className="w-5 h-5" />;
  if (action.includes('USER') || action.includes('LOGIN'))
    return <User className="w-5 h-5" />;
  if (action.includes('PAYMENT') || action.includes('REFUND'))
    return <CreditCard className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDetails(details: AuditLog['details']): string {
  if (!details) return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('7days');

  const filters: AuditFilters = useMemo(
    () => ({
      search: searchQuery,
      action: selectedAction,
      status: selectedStatus,
      dateRange,
    }),
    [searchQuery, selectedAction, selectedStatus, dateRange],
  );

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin', 'audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const errorMessage = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load audit logs' : null;

  const logs = data?.logs ?? [];
  const stats = data?.stats ?? { total: 0, success: 0, failure: 0, warning: 0 };

  const handleExport = useCallback(() => {
    if (logs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const csvHeader = 'Timestamp,User ID,Action,Resource Type,Resource ID,Status,IP Address,Details';
    const csvRows = logs.map((log) =>
      [
        log.created_at,
        log.user_id,
        log.action,
        log.resource_type,
        log.resource_id ?? '',
        log.status,
        log.ip_address ?? '',
        `"${formatDetails(log.details).replace(/"/g, '""')}"`,
      ].join(','),
    );

    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Audit logs exported successfully');
  }, [logs]);

  // -- Loading state -------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  // -- Error state ---------------------------------------------------------
  if (errorMessage && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load audit logs
          </h2>
          <p className="text-red-600 mb-6 text-sm break-words">{errorMessage}</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -- Main render ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Shield className="w-8 h-8" aria-hidden="true" />
                </div>
                <h1 className="text-4xl font-bold">Audit Logs</h1>
              </div>
              <p className="text-slate-300">
                Monitor all system activities and administrative actions
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isFetching && !isLoading && (
                <Loader2
                  className="w-5 h-5 text-slate-400 animate-spin"
                  aria-label="Refreshing data"
                />
              )}
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                aria-label="Export audit logs as CSV"
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-xl hover:shadow-lg transition-shadow font-semibold"
              >
                <Download className="w-5 h-5" aria-hidden="true" />
                Export Logs
              </MotionButton>
            </div>
          </div>

          {/* Stats in header */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8"
            aria-label="Audit log statistics"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <p className="text-slate-400 text-sm">Total Events</p>
              </div>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" aria-hidden="true" />
                <p className="text-slate-400 text-sm">Successful</p>
              </div>
              <p className="text-2xl font-bold">{stats.success.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                <p className="text-slate-400 text-sm">Failures</p>
              </div>
              <p className="text-2xl font-bold">{stats.failure.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                <p className="text-slate-400 text-sm">Warnings</p>
              </div>
              <p className="text-2xl font-bold">{stats.warning.toLocaleString()}</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter bar */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                id="audit-search"
                aria-label="Search audit logs"
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Action filter */}
            <select
              id="action-filter"
              aria-label="Filter by action"
              value={selectedAction}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedAction(e.target.value)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              id="audit-status-filter"
              aria-label="Filter by status"
              value={selectedStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedStatus(e.target.value)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Date range filter */}
            <select
              id="date-filter"
              aria-label="Filter by date range"
              value={dateRange}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setDateRange(e.target.value)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </MotionDiv>

        {/* Logs table */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Audit log entries">
              <caption className="sr-only">
                System audit log entries with timestamps, users, actions, and
                statuses
              </caption>
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Action
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Resource
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Clock
                          className="w-4 h-4 text-gray-400"
                          aria-hidden="true"
                        />
                        {formatTimestamp(log.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-full">
                          <User className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {log.user_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm text-gray-900">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {log.resource_type.replace(/_/g, ' ')}
                      </div>
                      {log.resource_id && (
                        <div className="text-xs text-gray-500 font-mono truncate max-w-[180px]">
                          {log.resource_id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(log.status)}`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-mono">
                        {log.ip_address ?? '--'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty state */}
            {logs.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <Shield
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No logs found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters or check back later.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedAction('all');
                    setSelectedStatus('all');
                    setDateRange('7days');
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Footer with count */}
          {logs.length > 0 && (
            <div className="px-6 py-3 bg-slate-50 border-t border-gray-200 text-sm text-gray-600 flex items-center justify-between">
              <span>
                Showing {logs.length} of {stats.total.toLocaleString()} entries
              </span>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            </div>
          )}
        </MotionDiv>
      </div>
    </div>
  );
}
