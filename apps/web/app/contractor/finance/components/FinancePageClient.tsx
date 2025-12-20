'use client';

import React, { useState, useMemo } from 'react';
import {
  PoundSterling,
  TrendingUp,
  FileText,
  Download,
  Send,
  Eye,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  Receipt,
} from 'lucide-react';
import { StandardCard, CardHeader, CardSection } from '@/components/contractor/StandardCard';
import { MetricCard } from '@/components/contractor/MetricCard';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/design-system/contractor-theme';
import toast from 'react-hot-toast';

interface Invoice {
  id: string;
  jobId: string;
  jobTitle: string;
  client: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
}

export function FinancePageClient() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual API calls
  const financeStats = {
    totalRevenue: 48750,
    pendingPayments: 12300,
    paidThisMonth: 18500,
    outstandingInvoices: 8,
  };

  const invoices: Invoice[] = [
    {
      id: 'INV-001',
      jobId: 'JOB-128',
      jobTitle: 'Kitchen sink replacement',
      client: 'Sarah Johnson',
      amount: 2500,
      status: 'paid',
      issueDate: '2025-01-15',
      dueDate: '2025-01-30',
      paidDate: '2025-01-25',
    },
    {
      id: 'INV-002',
      jobId: 'JOB-129',
      jobTitle: 'Boiler servicing',
      client: 'Michael Brown',
      amount: 450,
      status: 'sent',
      issueDate: '2025-01-20',
      dueDate: '2025-02-05',
    },
    {
      id: 'INV-003',
      jobId: 'JOB-130',
      jobTitle: 'Bathroom renovation',
      client: 'Emma Wilson',
      amount: 5200,
      status: 'overdue',
      issueDate: '2024-12-20',
      dueDate: '2025-01-10',
    },
    {
      id: 'INV-004',
      jobId: 'JOB-131',
      jobTitle: 'Emergency leak repair',
      client: 'David Lee',
      amount: 850,
      status: 'paid',
      issueDate: '2025-01-10',
      dueDate: '2025-01-25',
      paidDate: '2025-01-22',
    },
    {
      id: 'INV-005',
      jobId: 'JOB-132',
      jobTitle: 'Heating system inspection',
      client: 'Lisa Anderson',
      amount: 380,
      status: 'draft',
      issueDate: '2025-01-28',
      dueDate: '2025-02-12',
    },
  ];

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
      const matchesSearch =
        searchQuery === '' ||
        invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [selectedStatus, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'sent':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'overdue':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      case 'draft':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-600 mt-1">Manage invoices, payments, and financial reports</p>
        </div>
        <Button variant="primary" onClick={() => toast.success('Create invoice form opened')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Invoice
        </Button>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={financeStats.totalRevenue}
          icon={PoundSterling}
          isCurrency
          trend={{ value: 12.5, direction: 'up', label: 'vs last month' }}
        />
        <MetricCard
          title="Pending Payments"
          value={financeStats.pendingPayments}
          icon={Clock}
          isCurrency
          subtitle={`${financeStats.outstandingInvoices} invoices`}
        />
        <MetricCard
          title="Paid This Month"
          value={financeStats.paidThisMonth}
          icon={CheckCircle}
          isCurrency
          trend={{ value: 8.3, direction: 'up' }}
        />
        <MetricCard
          title="Outstanding Invoices"
          value={financeStats.outstandingInvoices}
          icon={Receipt}
          subtitle="Awaiting payment"
        />
      </div>

      {/* Invoices Table */}
      <StandardCard>
        <CardHeader
          title="Invoices"
          subtitle={`${filteredInvoices.length} total`}
          icon={FileText}
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStatus === 'all'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStatus === 'paid'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setSelectedStatus('overdue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStatus === 'overdue'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Overdue
            </button>
          </div>
        </div>

        <CardSection>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Invoice</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Job</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Due Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">{invoice.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-900">{invoice.client}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{invoice.jobTitle}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.amount)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toast.success(`Viewing invoice ${invoice.id}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => toast.success(`Invoice ${invoice.id} sent to client`)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Send"
                          >
                            <Send className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={() => toast.success(`Invoice ${invoice.id} downloaded`)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardSection>
      </StandardCard>
    </div>
  );
}
