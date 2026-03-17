'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Users,
  CheckCircle,
  AlertTriangle,
  Download,
  Search,
  Filter,
  Loader2,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';

// -- Types -------------------------------------------------------------------

type Form1099Status = 'pending' | 'generated' | 'filed';
type W9Status = 'unverified' | 'submitted' | 'verified';

interface TaxSummary {
  totalRequiring1099: number;
  totalGenerated: number;
  totalFiled: number;
  totalEarnings: number;
}

interface ContractorTaxRow {
  contractorId: string;
  contractorName: string;
  email: string;
  tinLast4: string;
  totalEarnings: number;
  status: Form1099Status;
  w9Status: W9Status;
}

interface UnverifiedW9Row {
  contractorId: string;
  contractorName: string;
  email: string;
  submittedAt: string | null;
  w9Status: W9Status;
}

interface AdminTaxData {
  summary: TaxSummary;
  contractors: ContractorTaxRow[];
  unverifiedW9s: UnverifiedW9Row[];
}

// -- Fetch helper ------------------------------------------------------------

async function fetchTaxData(year: number): Promise<AdminTaxData> {
  const response = await fetch(`/api/admin/tax/summaries?year=${year}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tax data: ${response.status}`);
  }
  return response.json();
}

// -- Constants ---------------------------------------------------------------

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const STATUS_OPTIONS: { value: 'all' | Form1099Status; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'generated', label: 'Generated' },
  { value: 'filed', label: 'Filed' },
];

// -- Component ---------------------------------------------------------------

export default function AdminTaxDashboardPage() {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [statusFilter, setStatusFilter] = useState<'all' | Form1099Status>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [filingId, setFilingId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'tax', selectedYear],
    queryFn: () => fetchTaxData(selectedYear),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  const summary: TaxSummary = data?.summary ?? {
    totalRequiring1099: 0,
    totalGenerated: 0,
    totalFiled: 0,
    totalEarnings: 0,
  };

  const contractors = data?.contractors ?? [];
  const unverifiedW9s = data?.unverifiedW9s ?? [];

  // -- Filtered list ---------------------------------------------------------

  const filteredContractors = useMemo(() => {
    return contractors.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        c.contractorName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.tinLast4.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [contractors, statusFilter, searchQuery]);

  // -- Actions ---------------------------------------------------------------

  const handleGenerate = useCallback(async (contractorId: string) => {
    setGeneratingId(contractorId);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/admin/tax/generate-1099', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ contractorId, year: selectedYear }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(body.error || 'Failed to generate 1099');
      }
      toast.success('1099-NEC generated successfully');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate 1099');
    } finally {
      setGeneratingId(null);
    }
  }, [selectedYear, refetch]);

  const handleMarkFiled = useCallback(async (contractorId: string) => {
    setFilingId(contractorId);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/admin/tax/mark-filed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ contractorId, year: selectedYear }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Filing failed' }));
        throw new Error(body.error || 'Failed to mark as filed');
      }
      toast.success('1099-NEC marked as filed');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark as filed');
    } finally {
      setFilingId(null);
    }
  }, [selectedYear, refetch]);

  const handleGenerateAll = useCallback(async () => {
    setGeneratingAll(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/admin/tax/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ year: selectedYear }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Bulk generation failed' }));
        throw new Error(body.error || 'Failed to generate all pending 1099s');
      }
      const result = await res.json();
      toast.success(`Generated ${result.count ?? 0} 1099-NEC forms`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk generation failed');
    } finally {
      setGeneratingAll(false);
    }
  }, [selectedYear, refetch]);

  const handleExportCSV = useCallback(() => {
    if (filteredContractors.length === 0) {
      toast.error('No data to export');
      return;
    }

    const header = 'Contractor Name,Email,TIN Last 4,Total Earnings,1099 Status\n';
    const rows = filteredContractors.map((c) =>
      `"${c.contractorName}","${c.email}","${c.tinLast4}","${c.totalEarnings.toFixed(2)}","${c.status}"`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `1099-nec-report-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  }, [filteredContractors, selectedYear]);

  const handleDownload1099 = useCallback((contractorId: string) => {
    window.open(`/api/admin/tax/download-1099?contractorId=${contractorId}&year=${selectedYear}`, '_blank');
  }, [selectedYear]);

  // -- Status badge helper ---------------------------------------------------

  const getStatusBadge = (status: Form1099Status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            Pending
          </span>
        );
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <FileText className="w-3 h-3" aria-hidden="true" />
            Generated
          </span>
        );
      case 'filed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" aria-hidden="true" />
            Filed
          </span>
        );
    }
  };

  const getW9Badge = (status: W9Status) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <ShieldCheck className="w-3 h-3" aria-hidden="true" />
            Verified
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <FileText className="w-3 h-3" aria-hidden="true" />
            Submitted
          </span>
        );
      case 'unverified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ShieldAlert className="w-3 h-3" aria-hidden="true" />
            Unverified
          </span>
        );
    }
  };

  // -- Render: Loading -------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header skeleton */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="animate-pulse">
              <div className="h-10 w-64 bg-white/20 rounded-lg mb-2" />
              <div className="h-5 w-96 bg-white/10 rounded-lg" />
            </div>
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-xl mb-4" />
                <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Render: Error ---------------------------------------------------------

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Tax Data</h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -- Render: Main ----------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <MotionDiv
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl" aria-hidden="true">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">1099-NEC Tax Management</h1>
                <p className="text-slate-300 text-lg mt-1">
                  Generate and file 1099-NEC forms for contractors
                </p>
              </div>
            </div>

            {/* Year Selector */}
            <div className="relative">
              <label htmlFor="tax-year-select" className="sr-only">
                Select tax year
              </label>
              <select
                id="tax-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl px-5 py-3 pr-10 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                aria-label="Tax year"
              >
                {AVAILABLE_YEARS.map((year) => (
                  <option key={year} value={year} className="text-gray-900">
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <section aria-label="Tax summary metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.totalRequiring1099}</div>
              <div className="text-sm text-gray-600 mt-1">Contractors Requiring 1099</div>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.totalGenerated}</div>
              <div className="text-sm text-gray-600 mt-1">Forms Generated</div>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.totalFiled}</div>
              <div className="text-sm text-gray-600 mt-1">Forms Filed with IRS</div>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                ${summary.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Contractor Earnings</div>
            </MotionDiv>
          </div>
        </section>

        {/* Filters and Bulk Actions */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left: Search and Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <label htmlFor="contractor-search" className="sr-only">
                  Search contractors
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  id="contractor-search"
                  type="text"
                  placeholder="Search by name, email, or TIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
                <fieldset>
                  <legend className="sr-only">Filter by 1099 status</legend>
                  <div className="flex items-center gap-1" role="radiogroup" aria-label="1099 status filter">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        role="radio"
                        aria-checked={statusFilter === option.value}
                        onClick={() => setStatusFilter(option.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          statusFilter === option.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>

            {/* Right: Bulk Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                aria-label="Refresh data"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                aria-label="Export contractor tax data as CSV"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Export CSV
              </button>
              <button
                onClick={handleGenerateAll}
                disabled={generatingAll}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                aria-label="Generate all pending 1099-NEC forms"
              >
                {generatingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileText className="w-4 h-4" aria-hidden="true" />
                )}
                {generatingAll ? 'Generating...' : 'Generate All Pending'}
              </button>
            </div>
          </div>
        </MotionDiv>

        {/* Contractors Table */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Contractor 1099-NEC Status
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredContractors.length} contractor{filteredContractors.length !== 1 ? 's' : ''})
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Contractor 1099-NEC status table">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contractor
                  </th>
                  <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    TIN (Last 4)
                  </th>
                  <th scope="col" className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Earnings
                  </th>
                  <th scope="col" className="text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    W-9 Status
                  </th>
                  <th scope="col" className="text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    1099 Status
                  </th>
                  <th scope="col" className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContractors.map((contractor) => (
                  <tr
                    key={contractor.contractorId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contractor.contractorName}</p>
                        <p className="text-xs text-gray-500">{contractor.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-mono text-gray-700">
                        ***-**-{contractor.tinLast4}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        ${contractor.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {getW9Badge(contractor.w9Status)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {getStatusBadge(contractor.status)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {contractor.status === 'pending' && (
                          <button
                            onClick={() => handleGenerate(contractor.contractorId)}
                            disabled={generatingId === contractor.contractorId}
                            className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                            aria-label={`Generate 1099 for ${contractor.contractorName}`}
                          >
                            {generatingId === contractor.contractorId ? (
                              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                            ) : (
                              <FileText className="w-3 h-3" aria-hidden="true" />
                            )}
                            Generate
                          </button>
                        )}
                        {contractor.status === 'generated' && (
                          <>
                            <button
                              onClick={() => handleDownload1099(contractor.contractorId)}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                              aria-label={`Download 1099 for ${contractor.contractorName}`}
                            >
                              <Download className="w-3 h-3" aria-hidden="true" />
                              Download
                            </button>
                            <button
                              onClick={() => handleMarkFiled(contractor.contractorId)}
                              disabled={filingId === contractor.contractorId}
                              className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                              aria-label={`Mark 1099 as filed for ${contractor.contractorName}`}
                            >
                              {filingId === contractor.contractorId ? (
                                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                              ) : (
                                <CheckCircle className="w-3 h-3" aria-hidden="true" />
                              )}
                              Mark Filed
                            </button>
                          </>
                        )}
                        {contractor.status === 'filed' && (
                          <button
                            onClick={() => handleDownload1099(contractor.contractorId)}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                            aria-label={`Download filed 1099 for ${contractor.contractorName}`}
                          >
                            <Download className="w-3 h-3" aria-hidden="true" />
                            Download
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredContractors.length === 0 && (
            <div className="text-center py-16 px-6">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No contractors found</h3>
              <p className="text-sm text-gray-500">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : `No contractors require 1099-NEC forms for ${selectedYear}.`}
              </p>
            </div>
          )}
        </MotionDiv>

        {/* W-9 Verification Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm"
        >
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900">
              Unverified W-9 Forms
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({unverifiedW9s.length})
              </span>
            </h2>
          </div>

          {unverifiedW9s.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Unverified W-9 forms table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Contractor
                    </th>
                    <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th scope="col" className="text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unverifiedW9s.map((w9) => (
                    <tr key={w9.contractorId} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-900">
                        {w9.contractorName}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">{w9.email}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {w9.submittedAt
                          ? new Date(w9.submittedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Not submitted'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {getW9Badge(w9.w9Status)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => window.open(`/admin/users?search=${encodeURIComponent(w9.email)}`, '_self')}
                          className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                          aria-label={`Review W-9 for ${w9.contractorName}`}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 px-6">
              <ShieldCheck className="w-12 h-12 text-green-300 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">All W-9s Verified</h3>
              <p className="text-sm text-gray-500">
                All contractors have verified W-9 forms on file.
              </p>
            </div>
          )}
        </MotionDiv>
      </div>
    </div>
  );
}
