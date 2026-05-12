'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  PoundSterling,
  Plus,
  Download,
  Calendar,
  ReceiptPoundSterling,
  Tag,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Search,
  FileText,
  Loader2,
} from 'lucide-react';

// AUDIT_PUNCH_LIST P2 #64 (A2-P2-6) — `@tremor/react` ships ~200KB
// gzipped (Recharts under the hood). Static-importing it pulled the
// entire chart library into the initial bundle for every contractor
// user, even if they never opened /contractor/expenses. Lazy-load
// matches the proven pattern in `app/admin/ai-monitoring/components/
// AIMonitoringClient.tsx`. `ssr: false` since charts read window
// dimensions and have no SSR equivalent.
const AreaChart = dynamic(
  () => import('@tremor/react').then((m) => ({ default: m.AreaChart })),
  { ssr: false }
);
const DonutChart = dynamic(
  () => import('@tremor/react').then((m) => ({ default: m.DonutChart })),
  { ssr: false }
);
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import { ExpenseFormModal } from './ExpenseFormModal';
import { ExpenseStatsCards } from './ExpenseStatsCards';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  jobId?: string;
  jobTitle?: string | null;
  paymentMethod: string;
  receiptUrl?: string | null;
  notes?: string | null;
  tags: string[];
  isBillable: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'materials', label: 'Materials' },
  { value: 'tools', label: 'Tools & Equipment' },
  { value: 'fuel', label: 'Fuel & Transportation' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  'Business Card',
  'Cash',
  'Bank Transfer',
  'Personal Card',
];

export default function ExpenseTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Hydration-safe theme detection — Phase-4 contractor port pattern.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Add form state
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('materials');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [formPaymentMethod, setFormPaymentMethod] = useState('Business Card');
  const [formTags, setFormTags] = useState('');
  const [formIsBillable, setFormIsBillable] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contractor/expenses', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      logger.error('Error fetching expenses:', error, { service: 'app' });
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAddExpense = async () => {
    if (!formDescription.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      toast.error('Valid amount is required');
      return;
    }

    setSubmitting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/contractor/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          description: formDescription.trim(),
          category: formCategory,
          amount: Number(formAmount),
          date: formDate,
          paymentMethod: formPaymentMethod,
          tags: formTags
            ? formTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          isBillable: formIsBillable,
          notes: formNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add expense');
      }

      const data = await res.json();
      // Add to local state
      setExpenses((prev) => [
        {
          id: data.expense.id,
          description: data.expense.description,
          category: data.expense.category,
          amount: Number(data.expense.amount),
          date: data.expense.date,
          jobId: data.expense.job_id,
          jobTitle: null,
          paymentMethod: data.expense.payment_method || formPaymentMethod,
          receiptUrl: null,
          tags: data.expense.tags || [],
          isBillable: data.expense.is_billable || false,
          notes: data.expense.notes,
          createdAt: data.expense.created_at,
        },
        ...prev,
      ]);

      toast.success('Expense added');
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add expense'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormDescription('');
    setFormCategory('materials');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod('Business Card');
    setFormTags('');
    setFormIsBillable(false);
    setFormNotes('');
  };

  const handleDeleteExpense = async (id: string, description: string) => {
    if (!confirm(`Delete expense "${description}"?`)) return;

    const previous = [...expenses];
    setExpenses(expenses.filter((e) => e.id !== id));

    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/contractor/expenses?id=${id}`, {
        method: 'DELETE',
        headers: { ...csrfHeaders },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Expense deleted');
    } catch (error) {
      setExpenses(previous);
      toast.error('Failed to delete expense');
    }
  };

  const handleExport = () => {
    const monthExpenses = expenses.filter((e) =>
      e.date.startsWith(selectedMonth)
    );
    if (monthExpenses.length === 0) {
      toast.error('No expenses to export for this month');
      return;
    }

    const headers = [
      'Date',
      'Description',
      'Category',
      'Amount (GBP)',
      'Payment Method',
      'Billable',
      'Tags',
      'Notes',
    ];
    const rows = monthExpenses.map((e) => [
      e.date,
      `"${e.description}"`,
      CATEGORIES.find((c) => c.value === e.category)?.label || e.category,
      e.amount.toFixed(2),
      e.paymentMethod,
      e.isBillable ? 'Yes' : 'No',
      `"${e.tags.join(', ')}"`,
      `"${e.notes || ''}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mintenance-expenses-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Expenses exported');
  };

  // Stats
  const stats = useMemo(() => {
    const monthExpenses = expenses.filter((e) =>
      e.date.startsWith(selectedMonth)
    );
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const billable = monthExpenses
      .filter((e) => e.isBillable)
      .reduce((sum, e) => sum + e.amount, 0);
    const nonBillable = total - billable;

    const prevMonth = new Date(selectedMonth + '-01');
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const prevTotal = expenses
      .filter((e) => e.date.startsWith(prevMonthStr))
      .reduce((sum, e) => sum + e.amount, 0);
    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return { total, billable, nonBillable, change };
  }, [expenses, selectedMonth]);

  const expensesByCategory = useMemo(() => {
    const monthExpenses = expenses.filter((e) =>
      e.date.startsWith(selectedMonth)
    );
    const grouped = monthExpenses.reduce(
      (acc, expense) => {
        const cat =
          CATEGORIES.find((c) => c.value === expense.category)?.label ||
          'Other';
        acc[cat] = (acc[cat] || 0) + expense.amount;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(grouped).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [expenses, selectedMonth]);

  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-GB', { month: 'short' });
      const monthTotal = expenses
        .filter((e) => e.date.startsWith(monthStr))
        .reduce((sum, e) => sum + e.amount, 0);
      const billable = expenses
        .filter((e) => e.date.startsWith(monthStr) && e.isBillable)
        .reduce((sum, e) => sum + e.amount, 0);
      months.push({
        month: monthName,
        total: monthTotal,
        billable,
        nonBillable: monthTotal - billable,
      });
    }
    return months;
  }, [expenses]);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      searchQuery === '' ||
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === 'all' || expense.category === selectedCategory;
    const matchesMonth = expense.date.startsWith(selectedMonth);
    return matchesSearch && matchesCategory && matchesMonth;
  });

  if (loading) {
    return (
      <div className='min-h-0 bg-gray-50 flex items-center justify-center py-24'>
        <Loader2 className='w-8 h-8 animate-spin text-teal-600' />
      </div>
    );
  }

  return (
    <div className='min-h-0 bg-gray-50'>
      {/* Header — canonical .t-h1 + .btn pair when Mint Editorial,
          legacy white banner otherwise. */}
      {isMintEditorial ? (
        <div
          className='between'
          style={{ alignItems: 'flex-start', padding: '20px 0 24px' }}
        >
          <div className='col' style={{ gap: 4 }}>
            <h1 className='t-h1'>Expense tracking</h1>
            <p className='t-body'>
              Log mileage, materials, and tool purchases against your jobs —
              export at year-end for self-assessment or accountant handover.
            </p>
          </div>
          <div className='row' style={{ gap: 8 }}>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={handleExport}
            >
              <Download size={14} strokeWidth={1.75} />
              Export CSV
            </button>
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={14} strokeWidth={1.75} />
              Add expense
            </button>
          </div>
        </div>
      ) : (
        <div className='border-b border-gray-200 bg-white'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div>
                <h1 className='text-3xl font-semibold text-gray-900'>
                  Expense Tracking
                </h1>
                <p className='text-gray-600 mt-1'>
                  Track and manage your business expenses
                </p>
              </div>
              <div className='flex flex-wrap gap-3'>
                <button
                  onClick={handleExport}
                  className='flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <Download className='w-5 h-5' />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className='flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium'
                >
                  <Plus className='w-5 h-5' />
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <ExpenseStatsCards
          stats={stats}
          totalItems={filteredExpenses.length}
          staggerContainer={staggerContainer}
          staggerItem={staggerItem}
        />

        {/* Charts */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
          <MotionDiv
            variants={fadeIn}
            className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'
          >
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Expense Trend (Last 6 Months)
            </h3>
            <AreaChart
              data={monthlyTrend}
              index='month'
              categories={['billable', 'nonBillable']}
              colors={['green', 'orange']}
              valueFormatter={(value) => `\u00A3${value.toLocaleString()}`}
              className='h-72'
            />
          </MotionDiv>

          <MotionDiv
            variants={fadeIn}
            className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'
          >
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Expenses by Category
            </h3>
            {expensesByCategory.length > 0 ? (
              <DonutChart
                data={expensesByCategory}
                category='amount'
                index='category'
                valueFormatter={(value) => `\u00A3${value.toLocaleString()}`}
                colors={[
                  'blue',
                  'green',
                  'yellow',
                  'purple',
                  'red',
                  'pink',
                  'gray',
                ]}
                className='h-72'
              />
            ) : (
              <div className='h-72 flex items-center justify-center text-gray-400'>
                No data for this month
              </div>
            )}
          </MotionDiv>
        </div>

        {/* Filters and List */}
        <MotionDiv
          variants={fadeIn}
          className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'
        >
          <h3 className='text-lg font-semibold text-gray-900 mb-6'>
            Expense Details
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search expenses...'
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <input
              type='month'
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
            />
          </div>

          <div className='space-y-3'>
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className='p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow'
              >
                <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
                  <div className='flex-1'>
                    <div className='flex items-start justify-between mb-2'>
                      <div>
                        <h4 className='font-semibold text-gray-900'>
                          {expense.description}
                        </h4>
                        <div className='flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600'>
                          <span className='flex items-center gap-1'>
                            <Calendar className='w-4 h-4' />
                            {new Date(expense.date).toLocaleDateString('en-GB')}
                          </span>
                          <span className='px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-medium'>
                            {
                              CATEGORIES.find(
                                (c) => c.value === expense.category
                              )?.label
                            }
                          </span>
                          {expense.isBillable && (
                            <span className='px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium'>
                              Billable
                            </span>
                          )}
                          {expense.receiptUrl && (
                            <span className='flex items-center gap-1 text-blue-600'>
                              <ReceiptPoundSterling className='w-3 h-3' />
                              Receipt
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='text-xl font-bold text-gray-900'>
                          {'\u00A3'}
                          {expense.amount.toFixed(2)}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {expense.paymentMethod}
                        </p>
                      </div>
                    </div>
                    {expense.jobTitle && (
                      <p className='text-sm text-gray-600'>
                        Job:{' '}
                        <span className='font-medium'>{expense.jobTitle}</span>
                      </p>
                    )}
                    {expense.tags.length > 0 && (
                      <div className='flex flex-wrap gap-2 mt-2'>
                        {expense.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className='px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs'
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() =>
                        handleDeleteExpense(expense.id, expense.description)
                      }
                      className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                      title='Delete expense'
                    >
                      <Trash2 className='w-5 h-5' />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredExpenses.length === 0 && (
              <div className='text-center py-12'>
                <ReceiptPoundSterling className='w-16 h-16 text-gray-300 mx-auto mb-4' />
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  No expenses found
                </h3>
                <p className='text-gray-600'>
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first expense to get started'}
                </p>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>

      {showAddModal && (
        <ExpenseFormModal
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          onSubmit={handleAddExpense}
          submitting={submitting}
          description={formDescription}
          onDescriptionChange={setFormDescription}
          amount={formAmount}
          onAmountChange={setFormAmount}
          date={formDate}
          onDateChange={setFormDate}
          category={formCategory}
          onCategoryChange={setFormCategory}
          paymentMethod={formPaymentMethod}
          onPaymentMethodChange={setFormPaymentMethod}
          tags={formTags}
          onTagsChange={setFormTags}
          notes={formNotes}
          onNotesChange={setFormNotes}
          isBillable={formIsBillable}
          onIsBillableChange={setFormIsBillable}
          categories={CATEGORIES}
          paymentMethods={PAYMENT_METHODS}
        />
      )}
    </div>
  );
}
