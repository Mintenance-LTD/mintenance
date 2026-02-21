'use client';

import React, { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import toast from 'react-hot-toast';
import {
  Plus,
  FileText,
  Calendar,
  Eye,
  Send,
  Edit,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Mail,
  MoreVertical,
  Search,
  TrendingUp,
  TrendingDown,
  PoundSterling,
  ArrowUpRight,
  Filter,
  ChevronDown,
  User,
  CreditCard,
} from 'lucide-react';

type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled' | 'partial';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  total_amount: number;
  paid_amount?: number;
  status: InvoiceStatus;
  due_date: string;
  created_at: string;
  issue_date?: string;
}

interface InvoiceAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  action?: () => void;
  danger?: boolean;
}

interface InvoiceManagementClientProps {
  invoices: Invoice[];
  stats: {
    totalOutstanding: number;
    overdue: number;
    paidThisMonth: number;
  };
}

const FILTERS: Array<{ id: 'all' | InvoiceStatus; label: string }> = [
  { id: 'all', label: 'All Invoices' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'paid', label: 'Paid' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'partial', label: 'Partial' },
  { id: 'cancelled', label: 'Cancelled' },
];

// Slicker status configurations
const STATUS_CONFIG: Record<InvoiceStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  draft: {
    label: 'Draft',
    icon: FileText,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
  },
  sent: {
    label: 'Sent',
    icon: Mail,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  partial: {
    label: 'Partial',
    icon: Clock,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value || 0);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)} days overdue`;
  } else if (diffInDays === 0) {
    return 'Due today';
  } else if (diffInDays === 1) {
    return 'Due tomorrow';
  } else if (diffInDays <= 7) {
    return `Due in ${diffInDays} days`;
  }
  return formatDate(dateString);
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Stat Card Component - Calendar style
const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-6 h-6 text-teal-600" />
      <p className="text-gray-600 text-sm font-medium">{title}</p>
    </div>
    <div className="flex items-end justify-between">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {trend && trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {trendLabel}
        </div>
      )}
    </div>
  </div>
);

// Invoice Status Badge - lighter
const StatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

// Action Menu Component - lighter styling
const ActionMenu = ({ invoice, onSend, onMarkPaid, onRemind, onDelete, onDownloadPDF }: {
  invoice: Invoice;
  onSend: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onRemind: (id: string) => void;
  onDelete: (id: string) => void;
  onDownloadPDF: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = useMemo(() => {
    const baseActions: InvoiceAction[] = [
      { icon: Eye, label: 'View Details', href: `/invoices/${invoice.id}` },
      { icon: Download, label: 'Download PDF', action: () => onDownloadPDF(invoice.id) },
    ];

    if (invoice.status === 'draft') {
      baseActions.unshift(
        { icon: Edit, label: 'Edit Invoice', href: `/invoices/${invoice.id}/edit` },
        { icon: Send, label: 'Send to Client', action: () => onSend(invoice.id) },
      );
    } else if (invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partial') {
      baseActions.unshift(
        { icon: CheckCircle, label: 'Mark as Paid', action: () => onMarkPaid(invoice.id) },
        { icon: Send, label: 'Send Reminder', action: () => onRemind(invoice.id) },
      );
    }

    if (invoice.status !== 'paid') {
      baseActions.push(
        { icon: Trash2, label: 'Delete', action: () => onDelete(invoice.id), danger: true },
      );
    }

    return baseActions;
  }, [invoice, onSend, onMarkPaid, onRemind, onDelete, onDownloadPDF]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20"
            >
              {actions.map((action, index) => (
                action.href ? (
                  <Link
                    key={index}
                    href={action.href}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                      action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                    }`}
                  >
                    <action.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </Link>
                ) : (
                  <button
                    key={index}
                    onClick={() => {
                      action.action?.();
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                      action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                    }`}
                  >
                    <action.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                )
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Invoice Card Component - Calendar styling
const InvoiceCard = ({ invoice, onSend, onMarkPaid, onRemind, onDelete, onDownloadPDF }: {
  invoice: Invoice;
  onSend: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onRemind: (id: string) => void;
  onDelete: (id: string) => void;
  onDownloadPDF: (id: string) => void;
}) => {
  const isOverdue = invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';
  const isDraft = invoice.status === 'draft';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-xl transition-all overflow-hidden ${
        isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
      }`}
    >
      <div className="p-6">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            {/* Client Avatar */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-teal-700 font-semibold text-sm">
              {getInitials(invoice.client_name)}
            </div>

            {/* Invoice Info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  #{invoice.invoice_number}
                </h3>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-sm font-medium text-gray-900">{invoice.client_name}</p>
              {invoice.client_email && (
                <p className="text-xs text-gray-500 mt-0.5">{invoice.client_email}</p>
              )}
            </div>
          </div>

          <ActionMenu invoice={invoice} onSend={onSend} onMarkPaid={onMarkPaid} onRemind={onRemind} onDelete={onDelete} onDownloadPDF={onDownloadPDF} />
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 my-4" />

        {/* Amount and Dates Row */}
        <div className="flex items-end justify-between">
          <div className="space-y-3">
            {/* Amount */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Total Amount</p>
              <p className="text-3xl font-semibold text-gray-900">
                {formatCurrency(invoice.total_amount)}
              </p>
              {invoice.status === 'partial' && invoice.paid_amount && (
                <p className="text-sm text-gray-600 mt-1">
                  {formatCurrency(invoice.paid_amount)} paid
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="flex items-center gap-6 text-sm">
              {invoice.issue_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Issued {formatDate(invoice.issue_date)}</span>
                </div>
              )}
              <div className={`flex items-center gap-2 font-medium ${
                isOverdue ? 'text-red-600' : isPaid ? 'text-green-600' : 'text-gray-900'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{getRelativeDate(invoice.due_date)}</span>
              </div>
            </div>
          </div>

          {/* Smart CTAs based on status */}
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Link href={`/invoices/${invoice.id}/edit`}>
                  <button className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm">
                    <Edit className="w-4 h-4 inline mr-1.5" />
                    Edit
                  </button>
                </Link>
                <button onClick={() => onSend(invoice.id)} className="px-5 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-all text-sm">
                  <Send className="w-4 h-4 inline mr-1.5" />
                  Send
                </button>
              </>
            )}

            {(invoice.status === 'sent' || invoice.status === 'partial') && (
              <>
                <button onClick={() => onRemind(invoice.id)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm">
                  <Send className="w-4 h-4 inline mr-1.5" />
                  Remind
                </button>
                <button onClick={() => onMarkPaid(invoice.id)} className="px-5 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-all text-sm">
                  <CheckCircle className="w-4 h-4 inline mr-1.5" />
                  Mark Paid
                </button>
              </>
            )}

            {isOverdue && (
              <>
                <button onClick={() => onRemind(invoice.id)} className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-all text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1.5" />
                  Send Reminder
                </button>
                <button onClick={() => onMarkPaid(invoice.id)} className="px-4 py-2.5 rounded-lg border border-green-300 text-green-700 font-medium hover:bg-green-50 transition-all text-sm">
                  <CheckCircle className="w-4 h-4 inline mr-1.5" />
                  Mark Paid
                </button>
              </>
            )}

            {isPaid && (
              <>
                <Link href={`/invoices/${invoice.id}`}>
                  <button className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm">
                    <Eye className="w-4 h-4 inline mr-1.5" />
                    View
                  </button>
                </Link>
                <button onClick={() => onDownloadPDF(invoice.id)} className="px-5 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-all text-sm">
                  <Download className="w-4 h-4 inline mr-1.5" />
                  Download
                </button>
              </>
            )}

            {invoice.status === 'cancelled' && (
              <Link href={`/invoices/${invoice.id}`}>
                <button className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm">
                  <Eye className="w-4 h-4 inline mr-1.5" />
                  View Details
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Loading Skeleton
const InvoiceCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-4 flex-1">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded-lg w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded-lg w-48" />
        </div>
      </div>
      <div className="w-8 h-8 bg-gray-200 rounded-lg" />
    </div>
    <div className="h-px bg-gray-200 my-4" />
    <div className="flex justify-between">
      <div>
        <div className="h-8 bg-gray-200 rounded-lg w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded-lg w-48" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 rounded-lg w-24" />
        <div className="h-10 bg-gray-200 rounded-lg w-32" />
      </div>
    </div>
  </div>
);

// Empty State
const EmptyState = ({ filter }: { filter: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-xl border border-gray-200 p-16 text-center"
  >
    <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-6">
      <FileText className="w-10 h-10 text-gray-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      {filter === 'all' ? 'No invoices yet' : `No ${filter} invoices`}
    </h3>
    <p className="text-gray-600 mb-8 max-w-md mx-auto">
      {filter === 'all'
        ? 'Start creating invoices to track your payments and manage your business finances.'
        : `You don't have any ${filter} invoices at the moment.`}
    </p>
    {filter === 'all' && (
      <Link href="/contractor/invoices/create">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:bg-teal-700 transition-all"
        >
          <Plus className="w-5 h-5 inline mr-2" />
          Create Your First Invoice
        </motion.button>
      </Link>
    )}
  </motion.div>
);

// Main Component
export function InvoiceManagementClient({ invoices: initialInvoices, stats }: InvoiceManagementClientProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [selectedFilter, setSelectedFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateInvoiceStatus = useCallback(async (invoiceId: string, status: string) => {
    const previous = [...invoices];
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: status as InvoiceStatus } : inv));
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/contractor/invoices?id=${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to update invoice'); }
      return true;
    } catch (error) {
      setInvoices(previous);
      toast.error(error instanceof Error ? error.message : 'Failed to update invoice');
      return false;
    }
  }, [invoices]);

  const handleSend = useCallback(async (invoiceId: string) => {
    const ok = await updateInvoiceStatus(invoiceId, 'sent');
    if (ok) toast.success('Invoice sent to client');
  }, [updateInvoiceStatus]);

  const handleMarkPaid = useCallback(async (invoiceId: string) => {
    const ok = await updateInvoiceStatus(invoiceId, 'paid');
    if (ok) toast.success('Invoice marked as paid');
  }, [updateInvoiceStatus]);

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

  const handleDelete = useCallback(async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    const previous = [...invoices];
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/contractor/invoices?id=${invoiceId}`, {
        method: 'DELETE',
        headers: { ...csrfHeaders },
        credentials: 'include',
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to delete invoice'); }
      toast.success('Invoice deleted');
    } catch (error) {
      setInvoices(previous);
      toast.error(error instanceof Error ? error.message : 'Failed to delete invoice');
    }
  }, [invoices]);

  const handleDownloadPDF = useCallback((invoiceId: string) => {
    window.open(`/api/contractor/invoices/${invoiceId}/pdf`, '_blank');
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ['Invoice #', 'Client', 'Email', 'Amount', 'Status', 'Due Date', 'Created'];
    const rows = invoices.map(inv => [
      inv.invoice_number,
      inv.client_name,
      inv.client_email || '',
      inv.total_amount.toFixed(2),
      inv.status,
      inv.due_date,
      inv.created_at,
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
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
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const pendingAmount = invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'partial')
      .reduce((sum, inv) => sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0);

    const overdueAmount = invoices
      .filter(inv => inv.status === 'overdue')
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
      filtered = filtered.filter(invoice => invoice.status === selectedFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        invoice =>
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
    <div className="min-h-screen">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(enhancedStats.totalRevenue)}
          icon={PoundSterling}
          trend="up"
          trendLabel="12.5%"
        />
        <StatCard
          title="Pending Amount"
          value={formatCurrency(enhancedStats.pendingAmount)}
          icon={Clock}
        />
        <StatCard
          title="Overdue Amount"
          value={formatCurrency(enhancedStats.overdueAmount)}
          icon={AlertCircle}
          trend="down"
          trendLabel="3.2%"
        />
        <StatCard
          title="Paid This Month"
          value={formatCurrency(enhancedStats.paidThisMonth)}
          icon={CheckCircle}
          trend="up"
          trendLabel="8.1%"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice #, client name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none text-sm"
              />
            </div>
          </div>

          {/* Create Invoice Button */}
          <Link href="/contractor/invoices/create">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:bg-teal-700 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {FILTERS.map((filter) => {
          const isActive = filter.id === selectedFilter;
          const count = filter.id === 'all'
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
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Invoice List */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <InvoiceCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState filter={selectedFilter === 'all' ? 'all' : STATUS_CONFIG[selectedFilter]?.label || selectedFilter} />
        ) : (
          <motion.div
            layout
            className="space-y-4"
          >
            {filteredInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} onSend={handleSend} onMarkPaid={handleMarkPaid} onRemind={handleRemind} onDelete={handleDelete} onDownloadPDF={handleDownloadPDF} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Footer */}
      {filteredInvoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Showing</p>
                <p className="text-lg font-semibold text-gray-900">
                  {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
                </p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
                </p>
              </div>
            </div>

            <button onClick={handleExportCSV} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all">
              <Download className="w-4 h-4" />
              Export to CSV
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
