'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';
import type {
  AdminTaxData,
  ContractorTaxRow,
  Form1099Status,
  TaxSummary,
  UnverifiedW9Row,
} from './_components/types';
import { AVAILABLE_YEARS, CURRENT_YEAR } from './_components/types';
import { SummaryCards } from './_components/SummaryCards';
import { FiltersBar } from './_components/FiltersBar';
import { ContractorsTable } from './_components/ContractorsTable';
import { UnverifiedW9Table } from './_components/UnverifiedW9Table';
import { TaxLoadingState, TaxErrorState } from './_components/TaxPageStates';

async function fetchTaxData(year: number): Promise<AdminTaxData> {
  const response = await fetch(`/api/admin/tax/summaries?year=${year}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tax data: ${response.status}`);
  }
  return response.json();
}

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

  const summary: TaxSummary = data?.stats ?? {
    totalRequiring1099: 0,
    totalGenerated: 0,
    totalFiled: 0,
    totalEarnings: 0,
  };

  // Map API summaries to the ContractorTaxRow shape the table expects
  // tax_profile is now nested under contractor (joined through profiles)
  const contractors: ContractorTaxRow[] = (data?.summaries ?? []).map((s) => {
    const c = Array.isArray(s.contractor) ? s.contractor[0] : s.contractor;
    const tp = c?.tax_profile ? (Array.isArray(c.tax_profile) ? c.tax_profile[0] : c.tax_profile) : null;
    return {
      contractorId: s.contractor_id,
      contractorName: c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : 'Unknown',
      email: c?.email ?? '',
      tinLast4: '****',
      totalEarnings: Number(s.total_earnings),
      status: s.form_1099_filed ? 'filed' : s.form_1099_generated ? 'generated' : 'pending',
      w9Status: tp?.w9_verified ? 'verified' : tp?.w9_submitted_at ? 'submitted' : 'unverified',
    };
  });

  const unverifiedW9s: UnverifiedW9Row[] = (data?.summaries ?? [])
    .filter((s) => {
      const c = Array.isArray(s.contractor) ? s.contractor[0] : s.contractor;
      const tp = c?.tax_profile ? (Array.isArray(c.tax_profile) ? c.tax_profile[0] : c.tax_profile) : null;
      return !tp?.w9_verified;
    })
    .map((s) => {
      const c = Array.isArray(s.contractor) ? s.contractor[0] : s.contractor;
      const tp = c?.tax_profile ? (Array.isArray(c.tax_profile) ? c.tax_profile[0] : c.tax_profile) : null;
      return {
        contractorId: s.contractor_id,
        contractorName: c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : 'Unknown',
        email: c?.email ?? '',
        submittedAt: tp?.w9_submitted_at ?? null,
        w9Status: tp?.w9_submitted_at ? 'submitted' : 'unverified',
      };
    });

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

  if (isLoading) {
    return <TaxLoadingState />;
  }

  if (error) {
    return <TaxErrorState error={error} onRetry={() => refetch()} />;
  }

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
        <SummaryCards summary={summary} />

        <FiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={() => refetch()}
          onExportCSV={handleExportCSV}
          onGenerateAll={handleGenerateAll}
          generatingAll={generatingAll}
        />

        <ContractorsTable
          contractors={filteredContractors}
          selectedYear={selectedYear}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          generatingId={generatingId}
          filingId={filingId}
          onGenerate={handleGenerate}
          onMarkFiled={handleMarkFiled}
          onDownload1099={handleDownload1099}
        />

        <UnverifiedW9Table rows={unverifiedW9s} />
      </div>
    </div>
  );
}
