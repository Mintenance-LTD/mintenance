'use client';

import React, { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getCsrfHeaders } from '@/lib/csrf-client';
import toast from 'react-hot-toast';
import {
  Plus,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  PoundSterling,
} from 'lucide-react';

import {
  Invoice,
  InvoiceStatus,
  InvoiceManagementClientProps,
  FILTERS,
  STATUS_CONFIG,
  formatCurrency,
} from './InvoiceManagement/types';
import { StatCard } from './InvoiceManagement/StatCard';
import { InvoiceCard } from './InvoiceManagement/InvoiceCard';
import { InvoiceCardSkeleton } from './InvoiceManagement/InvoiceCardSkeleton';
import { EmptyState } from './InvoiceManagement/EmptyState';

// Main Component
export function InvoiceManagementClient({
  invoices: initialInvoices,
  stats,
}: InvoiceManagementClientProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [selectedFilter, setSelectedFilter] =
    useState<(typeof FILTERS)[number]['id']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateInvoiceStatus = useCallback(
    async (invoiceId: string, status: string) => {
      const previous = [...invoices];
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status: status as InvoiceStatus }
            : inv
        )
      );
      try {
        const csrfHeaders = await getCsrfHeaders();
        const res = await fetch(`/api/contractor/invoices?id=${invoiceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update invoice');
        }
        return true;
      } catch (error) {
        setInvoices(previous);
        toast.error(
          error instanceof Error ? error.message : 'Failed to update invoice'
        );
        return false;
      }
    },
    [invoices]
  );

  const handleSend = useCallback(
    async (invoiceId: string) => {
      const ok = await updateInvoiceStatus(invoiceId, 'sent');
      if (ok) toast.success('Invoice sent to client');
    },
    [updateInvoiceStatus]
  );

  const handleMarkPaid = useCallback(
    async (invoiceId: string) => {
      const ok = await updateInvoiceStatus(invoiceId, 'paid');
      if (ok) toast.success('Invoice marked as paid');
    },
    [updateInvoiceStatus]
  );

  const handleRemind = useCallback(async (invoiceId: string) => {
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/contractor/invoices?id=${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ status: 'sent' }),
      });
      if (!res.ok) throw new Error('Failed to send reminder');
      toast.success('Payment reminder sent');
    } catch {
      toast.error('Failed to send reminder');
    }
  }, []);

  const handleDelete = useCallback(
    async (invoiceId: string) => {
      if (!confirm('Are you sure you want to delete this invoice?')) return;
      const previous = [...invoices];
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      try {
        const csrfHeaders = await getCsrfHeaders();
        const res = await fetch(`/api/contractor/invoices?id=${invoiceId}`, {
          method: 'DELETE',
          headers: { ...csrfHeaders },
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete invoice');
        }
        toast.success('Invoice deleted');
      } catch (error) {
        setInvoices(previous);
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete invoice'
        );
      }
    },
    [invoices]
  );

  const handleDownloadPDF = useCallback((invoiceId: string) => {
    window.open(`/api/contractor/invoices/${invoiceId}/pdf`, '_blank');
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Invoice #',
      'Client',
      'Email',
      'Amount',
      'Status',
      'Due Date',
      'Created',
    ];
    const rows = invoices.map((inv) => [
      inv.invoice_number,
      inv.client_name,
      inv.client_email || '',
      inv.total_amount.toFixed(2),
      inv.status,
      inv.due_date,
      inv.created_at,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Invoices exported to CSV');
  }, [invoices]);

  // Calculate enhanced stats
  const enhancedStats = useMemo(() => {
    const totalRevenue = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const pendingAmount = invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'partial')
      .reduce(
        (sum, inv) => sum + (inv.total_amount || 0) - (inv.paid_amount || 0),
        0
      );

    const overdueAmount = invoices
      .filter((inv) => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    return {
      totalRevenue,
      pendingAmount,
      overdueAmount,
      paidThisMonth: stats.paidThisMonth,
    };
  }, [invoices, stats]);

  // Filter and search invoices
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(
        (invoice) => invoice.status === selectedFilter
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number.toLowerCase().includes(query) ||
          invoice.client_name.toLowerCase().includes(query) ||
          invoice.client_email?.toLowerCase().includes(query)
      );
    }

    // Sort: overdue first, then by due date
    return filtered.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [invoices, selectedFilter, searchQuery]);

  return (
    <div className='min-h-screen'>
      {/* Stats Dashboard */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <StatCard
          title='Total Revenue'
          value={formatCurrency(enhancedStats.totalRevenue)}
          icon={PoundSterling}
        />
        <StatCard
          title='Pending Amount'
          value={formatCurrency(enhancedStats.pendingAmount)}
          icon={Clock}
        />
        <StatCard
          title='Overdue Amount'
          value={formatCurrency(enhancedStats.overdueAmount)}
          icon={AlertCircle}
        />
        <StatCard
          title='Paid This Month'
          value={formatCurrency(enhancedStats.paidThisMonth)}
          icon={CheckCircle}
        />
      </div>

      {/* Toolbar */}
      <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6'>
        <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between'>
          {/* Search */}
          <div className='flex-1 w-full lg:max-w-md'>
            <div className='relative'>
              <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Search by invoice #, client name, or email...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none text-sm'
              />
            </div>
          </div>

          {/* Create Invoice Button */}
          <Link href='/contractor/invoices/create'>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className='px-6 py-3 bg-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:bg-teal-700 transition-all flex items-center gap-2 whitespace-nowrap'
            >
              <Plus className='w-5 h-5' />
              Create Invoice
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className='flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide'>
        {FILTERS.map((filter) => {
          const isActive = filter.id === selectedFilter;
          const count =
            filter.id === 'all'
              ? invoices.length
              : invoices.filter((inv) => inv.status === filter.id).length;

          return (
            <motion.button
              key={filter.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedFilter(filter.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {filter.label}
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Invoice List */}
      <AnimatePresence mode='wait'>
        {isLoading ? (
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <InvoiceCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            filter={
              selectedFilter === 'all'
                ? 'all'
                : STATUS_CONFIG[selectedFilter]?.label || selectedFilter
            }
          />
        ) : (
          <motion.div layout className='space-y-4'>
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onSend={handleSend}
                onMarkPaid={handleMarkPaid}
                onRemind={handleRemind}
                onDelete={handleDelete}
                onDownloadPDF={handleDownloadPDF}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Footer */}
      {filteredInvoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='mt-8 bg-white rounded-xl border border-gray-200 p-6'
        >
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex items-center gap-6'>
              <div>
                <p className='text-sm font-medium text-gray-600 mb-1'>
                  Showing
                </p>
                <p className='text-lg font-semibold text-gray-900'>
                  {filteredInvoices.length}{' '}
                  {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
                </p>
              </div>
              <div className='h-12 w-px bg-gray-300' />
              <div>
                <p className='text-sm font-medium text-gray-600 mb-1'>
                  Total Value
                </p>
                <p className='text-lg font-semibold text-gray-900'>
                  {formatCurrency(
                    filteredInvoices.reduce(
                      (sum, inv) => sum + inv.total_amount,
                      0
                    )
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className='flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all'
            >
              <Download className='w-4 h-4' />
              Export to CSV
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
