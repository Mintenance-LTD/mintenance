'use client';

import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import React, { useState, useMemo, useEffect } from 'react';
import {
  PoundSterling,
  TrendingUp,
  TrendingDown,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Settings,
  Banknote,
  CreditCard,
  FileText,
  Calendar,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { DynamicLineChart, DynamicAreaChart, DynamicBarChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from '@/components/charts';

interface Transaction {
  id: string;
  jobId: string;
  jobTitle: string;
  client: string;
  amount: number;
  status: 'pending' | 'held' | 'released' | 'completed';
  date: string;
  platformFee: number;
  processingFee: number;
  netAmount: number;
}

export default function ContractorFinancePage2025() {
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/payments/history');
        if (!response.ok) throw new Error('Failed to fetch');

        const { payments } = await response.json();

        // Transform to transactions
        // API returns EscrowTransaction: { id, jobId, payerId, payeeId, amount, status, createdAt, job: { title }, payer: { first_name, last_name } }
        const transformed: Transaction[] = payments.map((p: any) => {
          // Map API status to finance page status
          // API: 'pending', 'held', 'released', 'refunded'
          // Finance page expects: 'pending', 'held', 'released', 'completed'
          let mappedStatus: 'pending' | 'held' | 'released' | 'completed' = 'pending';
          if (p.status === 'released') {
            mappedStatus = 'released';
          } else if (p.status === 'held') {
            mappedStatus = 'held';
          } else if (p.status === 'pending') {
            mappedStatus = 'pending';
          } else if (p.status === 'refunded') {
            mappedStatus = 'completed'; // Treat refunded as completed for display
          }

          // Get job title - API returns job object with title property
          const jobTitle = p.job?.title || 'Payment';
          
          // Get client name - for contractors viewing their finance page, client is the payer (homeowner)
          const clientName = p.payer 
            ? `${p.payer.first_name || ''} ${p.payer.last_name || ''}`.trim() || 'Client'
            : 'Unknown';

          // Calculate fees (5% platform + 2% processing = 7% total)
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

        setTransactions(transformed);
      } catch (error) {
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchTransactions();
  }, [user]);

  // Calculate stats
  const thisMonthRevenue = transactions
    .filter(t => {
      const date = new Date(t.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() &&
             date.getFullYear() === now.getFullYear() &&
             (t.status === 'released' || t.status === 'completed');
    })
    .reduce((sum, t) => sum + t.netAmount, 0);

  const lastMonthRevenue = transactions
    .filter(t => {
      const date = new Date(t.date);
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return date.getMonth() === lastMonth.getMonth() &&
             date.getFullYear() === lastMonth.getFullYear() &&
             (t.status === 'released' || t.status === 'completed');
    })
    .reduce((sum, t) => sum + t.netAmount, 0);

  const monthlyGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  const pendingPayouts = transactions
    .filter(t => t.status === 'held' || t.status === 'pending')
    .reduce((sum, t) => sum + t.netAmount, 0);

  const allTimeRevenue = transactions
    .filter(t => t.status === 'released' || t.status === 'completed')
    .reduce((sum, t) => sum + t.netAmount, 0);

  const avgJobValue = transactions.length > 0
    ? allTimeRevenue / transactions.length
    : 0;

  // Generate revenue chart data (last 6 months)
  const revenueChartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });

      const revenue = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate.getMonth() === date.getMonth() &&
                 tDate.getFullYear() === date.getFullYear() &&
                 (t.status === 'released' || t.status === 'completed');
        })
        .reduce((sum, t) => sum + t.netAmount, 0);

      months.push({
        month: monthName,
        revenue: Math.round(revenue),
        jobs: transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getMonth() === date.getMonth() &&
                 tDate.getFullYear() === date.getFullYear();
        }).length
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
        (filterStatus === 'pending' && (transaction.status === 'pending' || transaction.status === 'held')) ||
        (filterStatus === 'completed' && (transaction.status === 'completed' || transaction.status === 'released'));

      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'released':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'held':
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'released':
        return <CheckCircle className="w-4 h-4" />;
      case 'held':
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleExport = () => {
    toast.success('Exporting financial data...');
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowPricingModal(true);
  };

  const handlePayoutSettings = () => {
    toast.success('Opening payout settings...');
  };

  if (loading) {
    return (
      <ContractorPageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading finance data...</p>
          </div>
        </div>
      </ContractorPageWrapper>
    );
  }

  return (
    <ContractorPageWrapper>
      <div className="max-w-7xl mx-auto pb-12">
        {/* Clean Header - Airbnb Style */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">Finance</h1>
                <p className="text-gray-600 mt-1">Track your revenue and manage payouts</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export
                </button>
                <button
                  onClick={handlePayoutSettings}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* This Month Revenue */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <PoundSterling className="w-5 h-5 text-teal-600" />
                <p className="text-gray-600 text-sm font-medium">This Month</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">£{thisMonthRevenue.toLocaleString()}</p>
            </div>

            {/* Pending Payouts */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <p className="text-gray-600 text-sm font-medium">Pending</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">£{pendingPayouts.toLocaleString()}</p>
            </div>

            {/* All Time Revenue */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <p className="text-gray-600 text-sm font-medium">All Time</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">£{allTimeRevenue.toLocaleString()}</p>
            </div>

            {/* Average Job Value */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-5 h-5 text-blue-600" />
                <p className="text-gray-600 text-sm font-medium">Avg Job Value</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900">£{avgJobValue.toLocaleString()}</p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
                <p className="text-sm text-gray-600 mt-1">Monthly revenue trend (last 6 months)</p>
              </div>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(['week', 'month', 'year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>

          <ResponsiveContainer width="100%" height={300}>
            <DynamicAreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="month"
                stroke="#64748B"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#64748B"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `£${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: any) => [`£${value}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#14B8A6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </DynamicAreaChart>
          </ResponsiveContainer>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                <p className="text-sm text-gray-600 mt-1">View and manage your payment history</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'pending'
                      ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'completed'
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <PoundSterling className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-500">Your completed jobs and payments will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Date</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Job</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Client</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900">Amount</th>
                      <th className="text-center py-4 px-6 text-sm font-semibold text-gray-900">Status</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(transaction.date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-medium text-gray-900">{transaction.jobTitle}</p>
                          <p className="text-xs text-gray-500">ID: {transaction.jobId.slice(0, 8)}</p>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">{transaction.client}</td>
                        <td className="py-4 px-6 text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            £{transaction.netAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            of £{transaction.amount.toFixed(2)}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(transaction.status)}`}>
                              {getStatusIcon(transaction.status)}
                              {transaction.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleViewDetails(transaction)}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bank Account Section */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 text-white">

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-teal-500/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Payout Settings</h3>
                    <p className="text-sm text-gray-400 mt-1">Manage your bank account and payout schedule</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-400" />
                    Bank account verified
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Next payout in 3 days
                  </div>
                </div>
              </div>
              <button
                onClick={handlePayoutSettings}
                className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                <Settings className="w-4 h-4" />
                Manage
              </button>
            </div>
          </div>

          {/* Pricing Modal */}
          {showPricingModal && selectedTransaction && (
            <div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowPricingModal(false)}
            >
              <MotionDiv
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full"
              >
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Payment Breakdown
                  </h3>
                  <PricingBreakdown
                    items={[
                      {
                        id: '1',
                        label: 'Job Payment',
                        amount: selectedTransaction.amount,
                      },
                      {
                        id: '2',
                        label: 'Platform Fee (5%)',
                        amount: -selectedTransaction.platformFee,
                        isDiscount: true,
                      },
                      {
                        id: '3',
                        label: 'Processing Fee (2%)',
                        amount: -selectedTransaction.processingFee,
                        isDiscount: true,
                      },
                    ]}
                    subtotal={selectedTransaction.amount}
                    total={selectedTransaction.netAmount}
                    currency="£"
                    showSubtotal={false}
                  />
                  <div className="mt-6">
                    <button
                      onClick={() => setShowPricingModal(false)}
                      className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </MotionDiv>
            </div>
          )}
        </div>
      </div>
    </ContractorPageWrapper>
  );
}
