'use client';

import { transformPayments } from './_components/transaction-data';
import {
  HELD_ESCROW_STATUSES,
  type ContractorFinancialSummary,
} from '@/lib/contractor/financial-summary';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { KpiCards } from './_components/KpiCards';
import { RevenueChart } from './_components/RevenueChart';
import { TransactionsTable } from './_components/TransactionsTable';
import { BankAccountSection } from './_components/BankAccountSection';
import { PricingModal } from './_components/PricingModal';
import type { Transaction } from './_components/types';

async function fetchTransactions() {
  const [history, summaryResponse] = await Promise.all([
    fetch('/api/payments/history?limit=50&direction=received'),
    fetch('/api/contractor/finance-summary'),
  ]);
  if (!history.ok || !summaryResponse.ok)
    throw new Error('Failed to fetch finance');
  const [{ payments }, summary] = await Promise.all([
    history.json(),
    summaryResponse.json() as Promise<ContractorFinancialSummary>,
  ]);
  return {
    transactions: transformPayments(payments, summary.feeRate),
    summary,
  };
}

export default function ContractorFinancePage2025() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'pending' | 'completed'
  >('all');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const {
    data: financeData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contractor', user?.id, 'finance', 'transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
    meta: {
      onError: () => {
        toast.error('Failed to load transactions');
      },
    },
  });

  const transactions = useMemo(
    () => financeData?.transactions ?? [],
    [financeData]
  );
  const summary = financeData?.summary;
  const thisMonthRevenue = summary?.thisMonthRevenue ?? 0;
  const pendingPayouts = summary?.pendingPayouts ?? 0;
  const allTimeRevenue = summary?.allTimeRevenue ?? 0;
  const avgJobValue = summary?.avgJobValue ?? 0;
  const revenueChartData = summary?.monthlyRevenue ?? [];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        searchQuery === '' ||
        transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'pending' &&
          (transaction.status === 'pending' ||
            (HELD_ESCROW_STATUSES as readonly string[]).includes(
              transaction.status
            ))) ||
        (filterStatus === 'completed' &&
          (transaction.status === 'completed' ||
            transaction.status === 'released'));

      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, filterStatus]);

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const escapeCsv = (value: string | number) => {
      const s = String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
      'Date',
      'Job',
      'Job ID',
      'Client',
      'Gross (£)',
      'Platform fee (£)',
      'Platform-paid processing fee (£)',
      'Net payout (£)',
      'Fees finalized',
      'Status',
    ];

    const rows = filteredTransactions.map((t) => [
      new Date(t.date).toLocaleDateString('en-GB'),
      t.jobTitle,
      t.jobId,
      t.client,
      t.amount.toFixed(2),
      t.feesFinalized ? t.platformFee.toFixed(2) : '',
      t.feesFinalized ? t.processingFee.toFixed(2) : '',
      t.feesFinalized ? t.netAmount.toFixed(2) : '',
      t.feesFinalized ? 'yes' : 'pending',
      t.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mintenance-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} transactions`);
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowPricingModal(true);
  };

  const handlePayoutSettings = () => {
    router.push('/contractor/payouts');
  };

  // Hydration-safe theme detection — must call hooks unconditionally,
  // so this lives at the top of the component before any early
  // returns / branch logic.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (error) {
    return (
      <ContractorPageWrapper>
        <div role='alert' className='p-8'>
          <h1 className='text-xl font-semibold'>Finance could not be loaded</h1>
          <p className='my-4'>
            Your balances are unavailable. Please try again.
          </p>
          <button
            onClick={() => void refetch()}
            className='rounded-lg bg-teal-700 px-4 py-2 text-white'
          >
            Try again
          </button>
        </div>
      </ContractorPageWrapper>
    );
  }

  if (loading) {
    return (
      <ContractorPageWrapper>
        <div className='min-h-screen flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4' />
            <p className='text-slate-600 font-medium'>
              Loading finance data...
            </p>
          </div>
        </div>
      </ContractorPageWrapper>
    );
  }

  return (
    <ContractorPageWrapper>
      <div className='max-w-7xl mx-auto pb-12'>
        {/* Header — canonical .t-h1 + .btn pair when Mint Editorial
            is active; otherwise the existing Airbnb-style header. The
            `.me-legacy-fit` shell boundary maps the legacy header's
            Tailwind colours so the visual delta is mostly typography
            + button polish. */}
        {isMintEditorial ? (
          <div
            className='between'
            style={{ padding: '20px 0 12px', alignItems: 'flex-start' }}
          >
            <div className='col' style={{ gap: 4 }}>
              <h1 className='t-h1' style={{ margin: 0 }}>
                Finance{' '}
                <em style={{ color: 'var(--me-brand)', fontStyle: 'italic' }}>
                  overview
                </em>
              </h1>
              <p className='t-body'>
                Track revenue, monitor payouts, and reconcile escrow transfers
                from completed jobs.
              </p>
            </div>
            <div className='row' style={{ gap: 8 }}>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                onClick={handleExport}
              >
                <Download size={14} strokeWidth={1.75} />
                Export
              </button>
              <button
                type='button'
                className='btn btn-primary btn-sm'
                onClick={handlePayoutSettings}
              >
                <Settings size={14} strokeWidth={1.75} />
                Payout settings
              </button>
            </div>
          </div>
        ) : (
          <div className='bg-white border-b border-gray-200'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
              <div className='flex items-center justify-between'>
                <div>
                  <h1 className='text-3xl font-semibold text-gray-900'>
                    Finance
                  </h1>
                  <p className='text-gray-600 mt-1'>
                    Track your revenue and manage payouts
                  </p>
                </div>
                <div className='flex gap-3'>
                  <button
                    onClick={handleExport}
                    className='px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2'
                  >
                    <Download className='w-5 h-5' />
                    Export
                  </button>
                  <button
                    onClick={handlePayoutSettings}
                    className='px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2'
                  >
                    <Settings className='w-5 h-5' />
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <KpiCards
            thisMonthRevenue={thisMonthRevenue}
            pendingPayouts={pendingPayouts}
            allTimeRevenue={allTimeRevenue}
            avgJobValue={avgJobValue}
          />

          <RevenueChart revenueChartData={revenueChartData} />

          <TransactionsTable
            filteredTransactions={filteredTransactions}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onViewDetails={handleViewDetails}
          />

          <BankAccountSection onPayoutSettings={handlePayoutSettings} />

          {showPricingModal && selectedTransaction && (
            <PricingModal
              transaction={selectedTransaction}
              onClose={() => setShowPricingModal(false)}
            />
          )}
        </div>
      </div>
    </ContractorPageWrapper>
  );
}
