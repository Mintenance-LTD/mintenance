'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Send,
  Copy,
  Trash2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  XCircle,
  FileX,
  PoundSterling,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';

// Types
interface Quote {
  id: string;
  jobTitle: string;
  customerName: string;
  customerEmail?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  amount: number;
  createdDate: string;
  sentDate?: string;
  expiryDate: string;
  templateUsed?: string;
  items?: number;
}

type FilterTab = 'all' | 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardHover = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
};

export default function QuotesPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Real data from API
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiStats, setApiStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    declined: 0,
    totalRevenue: 0,
  });

  // Load quotes from API
  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contractor/quotes');
      if (!response.ok) throw new Error('Failed to fetch quotes');

      const data = await response.json();
      setQuotes(data.quotes || []);
      setApiStats(data.stats || apiStats);
    } catch (error) {
      logger.error('Error loading quotes:', error, { service: 'app' });
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = quotes.length;
    const pending = quotes.filter(q => q.status === 'sent').length;
    const pendingAmount = quotes
      .filter(q => q.status === 'sent')
      .reduce((sum, q) => sum + q.amount, 0);
    const accepted = quotes.filter(q => q.status === 'accepted').length;
    const acceptedAmount = quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + q.amount, 0);
    const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0;

    return {
      total,
      pending,
      pendingAmount,
      accepted,
      acceptedAmount,
      acceptanceRate,
    };
  }, [quotes]);

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    let filtered = quotes;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(q => q.status === activeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        q =>
          q.jobTitle.toLowerCase().includes(query) ||
          q.customerName.toLowerCase().includes(query) ||
          q.customerEmail?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [quotes, activeFilter, searchQuery]);

  // Get status configuration
  const getStatusConfig = (status: Quote['status']) => {
    const configs = {
      draft: {
        label: 'Draft',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: FileText,
        iconColor: 'text-gray-500',
        dotColor: 'bg-gray-500',
      },
      sent: {
        label: 'Sent',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: Clock,
        iconColor: 'text-amber-600',
        dotColor: 'bg-amber-500',
      },
      accepted: {
        label: 'Accepted',
        color: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: CheckCircle,
        iconColor: 'text-teal-600',
        dotColor: 'bg-teal-500',
      },
      declined: {
        label: 'Declined',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: XCircle,
        iconColor: 'text-red-600',
        dotColor: 'bg-red-500',
      },
      expired: {
        label: 'Expired',
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: FileX,
        iconColor: 'text-orange-600',
        dotColor: 'bg-orange-500',
      },
    };
    return configs[status];
  };

  // Handle quote actions
  const handleViewQuote = (id: string) => {
    router.push(`/contractor/quotes/${id}`);
  };

  const handleEditQuote = (id: string) => {
    router.push(`/contractor/quotes/${id}/edit`);
  };

  const handleSendQuote = (quote: Quote) => {
    toast.success(`Quote sent to ${quote.customerName}`);
    setShowActionMenu(null);
  };

  const handleDuplicateQuote = (quote: Quote) => {
    toast.success('Quote duplicated');
    setShowActionMenu(null);
  };

  const handleDeleteQuote = (quote: Quote) => {
    if (confirm(`Delete quote "${quote.jobTitle}"?`)) {
      toast.success('Quote deleted');
      setShowActionMenu(null);
    }
  };

  const handleDownloadPDF = (quote: Quote) => {
    toast.success('Downloading PDF...');
    setShowActionMenu(null);
  };

  // Filter tabs configuration
  const filterTabs: { value: FilterTab; label: string; count: number }[] = [
    { value: 'all', label: 'All Quotes', count: quotes.length },
    { value: 'draft', label: 'Draft', count: quotes.filter(q => q.status === 'draft').length },
    { value: 'sent', label: 'Sent', count: quotes.filter(q => q.status === 'sent').length },
    { value: 'accepted', label: 'Accepted', count: quotes.filter(q => q.status === 'accepted').length },
    { value: 'declined', label: 'Declined', count: quotes.filter(q => q.status === 'declined').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
      >
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
            Quotes
          </h1>
          <p className="text-slate-600 mt-1">Manage your quotes and proposals</p>
        </div>
        <button
          onClick={() => router.push('/contractor/quotes/create')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Create Quote
        </button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Total Quotes */}
        <motion.div
          variants={fadeInUp}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Total Quotes</p>
              <p className="text-3xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-teal-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              12% vs last month
            </span>
          </div>
        </motion.div>

        {/* Pending Amount */}
        <motion.div
          variants={fadeInUp}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Pending Amount</p>
              <p className="text-3xl font-semibold text-amber-600">£{stats.pendingAmount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-slate-600">
              {stats.pending} quotes awaiting response
            </span>
          </div>
        </motion.div>

        {/* Acceptance Rate */}
        <motion.div
          variants={fadeInUp}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Acceptance Rate</p>
              <p className="text-3xl font-semibold text-teal-600">{stats.acceptanceRate.toFixed(0)}%</p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-teal-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              Above average
            </span>
          </div>
        </motion.div>

        {/* Total Revenue */}
        <motion.div
          variants={fadeInUp}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Accepted Revenue</p>
              <p className="text-3xl font-semibold text-green-600">£{stats.acceptedAmount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <PoundSterling className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              18% growth
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Filters & Search */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm"
      >
        {/* Filter Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-2 p-6 overflow-x-auto">
            {filterTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200
                  ${
                    activeFilter === tab.value
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-gray-50 text-slate-700 hover:bg-gray-100'
                  }
                `}
              >
                {tab.label}
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-xs font-semibold
                    ${
                      activeFilter === tab.value
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }
                  `}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Actions */}
        <div className="p-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="search"
              placeholder="Search quotes by title, customer, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quotes Grid/List */}
      <AnimatePresence mode="wait">
        {filteredQuotes.length === 0 ? (
          // Empty State
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center"
          >
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No quotes found</h3>
              <p className="text-slate-600 mb-6">
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first quote to get started'}
              </p>
              {!searchQuery && activeFilter === 'all' && (
                <button
                  onClick={() => router.push('/contractor/quotes/create')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Quote
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          // Quotes Grid
          <motion.div
            key="quotes"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredQuotes.map((quote) => {
              const statusConfig = getStatusConfig(quote.status);
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={quote.id}
                  variants={fadeInUp}
                  whileHover="hover"
                  initial="rest"
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden group"
                >
                  {/* Card Header */}
                  <div className="p-8 border-b border-slate-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor} animate-pulse`} />
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setShowActionMenu(showActionMenu === quote.id ? null : quote.id)}
                          className="p-1.5 rounded-xl hover:bg-gray-100 transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-600" />
                        </button>

                        {/* Action Menu */}
                        <AnimatePresence>
                          {showActionMenu === quote.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl z-10 overflow-hidden"
                            >
                              <button
                                onClick={() => handleViewQuote(quote.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              {quote.status === 'draft' && (
                                <button
                                  onClick={() => handleEditQuote(quote.id)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit Quote
                                </button>
                              )}
                              {(quote.status === 'draft' || quote.status === 'expired') && (
                                <button
                                  onClick={() => handleSendQuote(quote)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all"
                                >
                                  <Send className="w-4 h-4" />
                                  Send Quote
                                </button>
                              )}
                              <button
                                onClick={() => handleDuplicateQuote(quote)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(quote)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all"
                              >
                                <Download className="w-4 h-4" />
                                Download PDF
                              </button>
                              <div className="border-t border-slate-100" />
                              <button
                                onClick={() => handleDeleteQuote(quote)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-teal-600 transition-all">
                      {quote.jobTitle}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{quote.customerName}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-8 space-y-6">
                    {/* Amount */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Quote Amount</p>
                      <p className="text-3xl font-semibold text-slate-900">
                        £{quote.amount.toLocaleString()}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Items</span>
                        <span className="font-semibold text-slate-900">{quote.items || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Created</span>
                        <span className="font-medium text-slate-900">
                          {new Date(quote.createdDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {quote.sentDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Sent</span>
                          <span className="font-medium text-slate-900">
                            {new Date(quote.sentDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Expires</span>
                        <span className="font-medium text-slate-900">
                          {new Date(quote.expiryDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Template Badge */}
                    {quote.templateUsed && (
                      <div className="pt-3 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <FileText className="w-3.5 h-3.5" />
                          {quote.templateUsed}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-8 pb-8">
                    {quote.status === 'draft' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleEditQuote(quote.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleSendQuote(quote)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-xl text-sm font-medium"
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleViewQuote(quote.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium group"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                        <ArrowUpRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
