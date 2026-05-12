'use client';

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
import type { Transaction, EscrowTransaction } from './_components/types';

function transformPayments(payments: EscrowTransaction[]): Transaction[] {
  return payments.map((p: EscrowTransaction) => {
    let mappedStatus: 'pending' | 'held' | 'released' | 'completed' = 'pending';
    if (p.status === 'released') {
      mappedStatus = 'released';
    } else if (p.status === 'held') {
      mappedStatus = 'held';
    } else if (p.status === 'pending') {
      mappedStatus = 'pending';
    } else if (p.status === 'refunded') {
      mappedStatus = 'completed';
    }

    const jobTitle = p.job?.title || 'Payment';
    const clientName = p.payer
      ? `${p.payer.first_name || ''} ${p.payer.last_name || ''}`.trim() ||
        'Client'
      : 'Unknown';

    const platformFee = p.amount * 0.05;
    const processingFee = p.amount * 0.02;
    const netAmount = p.amount - platformFee - processingFee;

    return {
      id: p.id,
      jobId: p.jobId || p.job_id || '',
      jobTitle,
      client: clientName,
      amount: Number(p.amount) || 0,
      status: mappedStatus,
      date: p.createdAt || p.created_at || new Date().toISOString(),
      platformFee,
      processingFee,
      netAmount,
    };
  });
}

async function fetchTransactions(): Promise<Transaction[]> {
  const response = await fetch('/api/payments/history');
  if (!response.ok) throw new Error('Failed to fetch');
  const { payments } = await response.json();
  return transformPayments(payments);
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
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>(
    'month'
  );

  const { data: transactions = [], isLoading: loading } = useQuery<
    Transaction[]
  >({
    queryKey: ['contractor', 'finance', 'transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
    meta: {
      onError: () => {
        toast.error('Failed to load transactions');
      },
    },
  });

  // Calculate stats
  const thisMonthRevenue = transactions
    .filter((t) => {
      const date = new Date(t.date);
      const now = new Date();
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear() &&
        (t.status === 'released' || t.status === 'completed')
      );
    })
    .reduce((sum, t) => sum + t.netAmount, 0);

  const pendingPayouts = transactions
    .filter((t) => t.status === 'held' || t.status === 'pending')
    .reduce((sum, t) => sum + t.netAmount, 0);

  const allTimeRevenue = transactions
    .filter((t) => t.status === 'released' || t.status === 'completed')
    .reduce((sum, t) => sum + t.netAmount, 0);

  const avgJobValue =
    transactions.length > 0 ? allTimeRevenue / transactions.length : 0;

  // Generate revenue chart data (last 6 months)
  const revenueChartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-GB', { month: 'short' });

      const revenue = transactions
        .filter((t) => {
          const tDate = new Date(t.date);
          return (
            tDate.getMonth() === date.getMonth() &&
            tDate.getFullYear() === date.getFullYear() &&
            (t.status === 'released' || t.status === 'completed')
          );
        })
        .reduce((sum, t) => sum + t.netAmount, 0);

      months.push({
        month: monthName,
        revenue: Math.round(revenue),
        jobs: transactions.filter((t) => {
          const tDate = new Date(t.date);
          return (
            tDate.getMonth() === date.getMonth() &&
            tDate.getFullYear() === date.getFullYear()
          );
        }).length,
      });
    }

    return months;
  }, [transactions]);

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
            transaction.status === 'held')) ||
        (filterStatus === 'completed' &&
          (transaction.status === 'completed' ||
            transaction.status === 'released'));

      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, filterStatus]);

  const handleExport = () => {
    toast.success('Exporting financial data...');
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
              <h1 className='t-h1'>Finance</h1>
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

          <RevenueChart
            revenueChartData={revenueChartData}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />

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
