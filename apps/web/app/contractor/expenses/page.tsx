'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import {
  DollarSign,
  Plus,
  Download,
  Upload,
  Filter,
  Calendar,
  Receipt,
  Tag,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Search,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { AreaChart, DonutChart, BarChart } from '@tremor/react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
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
  jobTitle?: string;
  paymentMethod: string;
  receiptUrl?: string;
  notes?: string;
  tags: string[];
  isBillable: boolean;
  status: 'pending' | 'approved' | 'reimbursed';
}

export default function ExpenseTrackingPage2025() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('2025-01');
  const [showAddModal, setShowAddModal] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      date: '2025-01-28',
      description: 'Electrical supplies - Wire and fixtures',
      category: 'materials',
      amount: 245.50,
      jobId: 'job_123',
      jobTitle: 'Kitchen Renovation',
      paymentMethod: 'Business Card',
      receiptUrl: '/receipts/receipt1.pdf',
      tags: ['electrical', 'supplies'],
      isBillable: true,
      status: 'approved',
    },
    {
      id: '2',
      date: '2025-01-25',
      description: 'Fuel - Van refill',
      category: 'fuel',
      amount: 65.00,
      paymentMethod: 'Business Card',
      tags: ['transportation'],
      isBillable: false,
      status: 'approved',
    },
    {
      id: '3',
      date: '2025-01-22',
      description: 'Tools - New power drill',
      category: 'tools',
      amount: 180.00,
      paymentMethod: 'Cash',
      receiptUrl: '/receipts/receipt3.pdf',
      tags: ['equipment'],
      isBillable: false,
      status: 'approved',
    },
    {
      id: '4',
      date: '2025-01-20',
      description: 'Plumbing materials',
      category: 'materials',
      amount: 320.75,
      jobId: 'job_456',
      jobTitle: 'Bathroom Remodel',
      paymentMethod: 'Business Card',
      receiptUrl: '/receipts/receipt4.pdf',
      tags: ['plumbing', 'supplies'],
      isBillable: true,
      status: 'reimbursed',
    },
    {
      id: '5',
      date: '2025-01-18',
      description: 'Software subscription - Project management',
      category: 'software',
      amount: 29.99,
      paymentMethod: 'Business Card',
      tags: ['subscription'],
      isBillable: false,
      status: 'approved',
    },
  ]);

  const categories = [
    { value: 'all', label: 'All Categories', color: 'gray' },
    { value: 'materials', label: 'Materials', color: 'blue' },
    { value: 'tools', label: 'Tools & Equipment', color: 'green' },
    { value: 'fuel', label: 'Fuel & Transportation', color: 'yellow' },
    { value: 'software', label: 'Software & Subscriptions', color: 'purple' },
    { value: 'insurance', label: 'Insurance', color: 'red' },
    { value: 'marketing', label: 'Marketing', color: 'pink' },
    { value: 'other', label: 'Other', color: 'gray' },
  ];

  // Calculate stats
  const stats = useMemo(() => {
    const monthExpenses = expenses.filter(
      (e) => e.date.startsWith(selectedMonth)
    );

    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const billable = monthExpenses
      .filter((e) => e.isBillable)
      .reduce((sum, e) => sum + e.amount, 0);
    const nonBillable = total - billable;

    // Compare to previous month
    const prevMonth = new Date(selectedMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = prevMonth.toISOString().slice(0, 7);
    const prevTotal = expenses
      .filter((e) => e.date.startsWith(prevMonthStr))
      .reduce((sum, e) => sum + e.amount, 0);

    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return { total, billable, nonBillable, change };
  }, [expenses, selectedMonth]);

  // Expense by category
  const expensesByCategory = useMemo(() => {
    const monthExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));
    const grouped = monthExpenses.reduce((acc, expense) => {
      const cat = categories.find((c) => c.value === expense.category)?.label || 'Other';
      acc[cat] = (acc[cat] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [expenses, selectedMonth]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
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
      expense.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || expense.category === selectedCategory;

    const matchesMonth = expense.date.startsWith(selectedMonth);

    return matchesSearch && matchesCategory && matchesMonth;
  });

  const handleDeleteExpense = (id: string, description: string) => {
    if (confirm(`Delete expense "${description}"?`)) {
      setExpenses(expenses.filter((e) => e.id !== id));
      toast.success('Expense deleted');
    }
  };

  const handleExport = () => {
    toast.success('Exporting expenses to CSV...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-red-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 to-red-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Expense Tracking</h1>
              <p className="text-emerald-100">
                Track and manage your business expenses
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Expense
              </button>
            </div>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
        >
          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              {stats.change !== 0 && (
                <div
                  className={`flex items-center gap-1 text-sm ${
                    stats.change > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {stats.change > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(stats.change).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900">
              £{stats.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-green-100 rounded-lg mb-4 w-fit">
              <Receipt className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Billable Expenses</p>
            <p className="text-2xl font-bold text-gray-900">
              £{stats.billable.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
              <Tag className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Non-Billable</p>
            <p className="text-2xl font-bold text-gray-900">
              £{stats.nonBillable.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-purple-100 rounded-lg mb-4 w-fit">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">
              {filteredExpenses.length}
            </p>
          </MotionDiv>
        </MotionDiv>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Trend Chart */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Expense Trend (Last 6 Months)
            </h3>
            <AreaChart
              data={monthlyTrend}
              index="month"
              categories={['billable', 'nonBillable']}
              colors={['green', 'orange']}
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              className="h-72"
            />
          </MotionDiv>

          {/* Category Breakdown */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Expenses by Category
            </h3>
            <DonutChart
              data={expensesByCategory}
              category="amount"
              index="category"
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              colors={['blue', 'green', 'yellow', 'purple', 'red', 'pink', 'gray']}
              className="h-72"
            />
          </MotionDiv>
        </div>

        {/* Filters and List */}
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Expense Details</h3>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Expense List */}
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {expense.description}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(expense.date).toLocaleDateString('en-GB')}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                            {categories.find((c) => c.value === expense.category)?.label}
                          </span>
                          {expense.isBillable && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                              Billable
                            </span>
                          )}
                          {expense.receiptUrl && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Receipt className="w-3 h-3" />
                              Receipt
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          £{expense.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{expense.paymentMethod}</p>
                      </div>
                    </div>

                    {expense.jobTitle && (
                      <p className="text-sm text-gray-600">
                        Job: <span className="font-medium">{expense.jobTitle}</span>
                      </p>
                    )}

                    {expense.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {expense.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/contractor/expenses/${expense.id}`)}
                      className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => router.push(`/contractor/expenses/${expense.id}/edit`)}
                      className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id, expense.description)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredExpenses.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No expenses found
                </h3>
                <p className="text-gray-600">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first expense to get started'}
                </p>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Expense</h3>
            <p className="text-gray-600 mb-6">Expense form would go here...</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Expense added');
                  setShowAddModal(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add Expense
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
