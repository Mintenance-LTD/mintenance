'use client';

import React, { useState, useMemo } from 'react';
import { AreaChart, DonutChart, BarChart } from '@tremor/react';
import {
  DollarSign,
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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

export default function ContractorFinancePage2025() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y'>('30d');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual API calls
  const financeStats = {
    totalRevenue: 48750,
    pendingPayments: 12300,
    paidThisMonth: 18500,
    outstandingInvoices: 8,
    averageInvoiceValue: 2437,
    paymentRate: 92.5,
  };

  const revenueByMonth = [
    { month: 'Jul', revenue: 6200, expenses: 1800 },
    { month: 'Aug', revenue: 5800, expenses: 1600 },
    { month: 'Sep', revenue: 7100, expenses: 2100 },
    { month: 'Oct', revenue: 8200, expenses: 2400 },
    { month: 'Nov', revenue: 6900, expenses: 1900 },
    { month: 'Dec', revenue: 9500, expenses: 2800 },
    { month: 'Jan', revenue: 5050, expenses: 1450 },
  ];

  const revenueByCategory = [
    { category: 'Plumbing', revenue: 18500 },
    { category: 'Heating', revenue: 12300 },
    { category: 'Gas Safety', revenue: 8900 },
    { category: 'Repairs', revenue: 6200 },
    { category: 'Installation', revenue: 2850 },
  ];

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
  }, [invoices, selectedStatus, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'sent':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
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

  const handleCreateInvoice = () => {
    toast.success('Create invoice form opened');
  };

  const handleViewInvoice = (id: string) => {
    toast.success(`Viewing invoice ${id}`);
  };

  const handleSendInvoice = (id: string) => {
    toast.success(`Invoice ${id} sent to client`);
  };

  const handleDownloadInvoice = (id: string) => {
    toast.success(`Invoice ${id} downloaded`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 via-amber-600 to-emerald-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <DollarSign className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Finance & Invoicing</h1>
              </div>
              <p className="text-emerald-100 text-lg">
                Manage invoices, track payments, and monitor revenue
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateInvoice}
              className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </MotionButton>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Total Revenue</p>
              </div>
              <p className="text-3xl font-bold">£{financeStats.totalRevenue.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-200" />
                <p className="text-emerald-100 text-sm">Pending</p>
              </div>
              <p className="text-3xl font-bold">£{financeStats.pendingPayments.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <p className="text-emerald-100 text-sm">Paid This Month</p>
              </div>
              <p className="text-3xl font-bold">£{financeStats.paidThisMonth.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Outstanding</p>
              </div>
              <p className="text-3xl font-bold">{financeStats.outstandingInvoices}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Avg Invoice</p>
              </div>
              <p className="text-3xl font-bold">£{financeStats.averageInvoiceValue.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <p className="text-emerald-100 text-sm">Payment Rate</p>
              </div>
              <p className="text-3xl font-bold">{financeStats.paymentRate}%</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue & Expenses Chart */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Revenue & Expenses</h2>
              <div className="flex gap-2">
                {(['30d', '90d', '1y'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedPeriod === period
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period === '30d' && '30D'}
                    {period === '90d' && '90D'}
                    {period === '1y' && '1Y'}
                  </button>
                ))}
              </div>
            </div>
            <AreaChart
              data={revenueByMonth}
              index="month"
              categories={['revenue', 'expenses']}
              colors={['orange', 'red']}
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              showAnimation={true}
              showLegend={true}
              showGridLines={true}
              className="h-64"
            />
          </MotionDiv>

          {/* Revenue by Category */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Category</h2>
            <DonutChart
              data={revenueByCategory}
              category="revenue"
              index="category"
              colors={['orange', 'amber', 'yellow', 'lime', 'emerald']}
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              showAnimation={true}
              className="h-64"
            />
          </MotionDiv>
        </div>

        {/* Invoices Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Invoices</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <MotionDiv
                key={invoice.id}
                whileHover={{ y: -2 }}
                className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{invoice.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        {invoice.status}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-4">{invoice.jobTitle}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Client</p>
                        <p className="font-medium text-gray-900">{invoice.client}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Issue Date</p>
                        <p className="font-medium text-gray-900">{invoice.issueDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Due Date</p>
                        <p className="font-medium text-gray-900">{invoice.dueDate}</p>
                      </div>
                      {invoice.paidDate && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Paid Date</p>
                          <p className="font-medium text-green-600">{invoice.paidDate}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-6">
                    <p className="text-sm text-gray-500 mb-1">Amount</p>
                    <p className="text-3xl font-bold text-emerald-600 mb-4">
                      £{invoice.amount.toLocaleString()}
                    </p>
                    <div className="flex gap-2">
                      <MotionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleViewInvoice(invoice.id)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-5 h-5" />
                      </MotionButton>
                      {invoice.status === 'draft' && (
                        <MotionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSendInvoice(invoice.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Send"
                        >
                          <Send className="w-5 h-5" />
                        </MotionButton>
                      )}
                      <MotionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </MotionButton>
                    </div>
                  </div>
                </div>
              </MotionDiv>
            ))}
          </div>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters or search query</p>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateInvoice}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create First Invoice
              </MotionButton>
            </div>
          )}
        </MotionDiv>
      </div>
    </div>
  );
}
