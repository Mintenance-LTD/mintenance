'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { useQuotesData } from './components/useQuotesData';
import { QuotesStatsGrid } from './components/QuotesStatsGrid';
import { QuotesFilterBar } from './components/QuotesFilterBar';
import { QuoteCard } from './components/QuoteCard';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

export default function QuotesPage() {
  const router = useRouter();
  const {
    loading,
    stats,
    filteredQuotes,
    filterTabs,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    showActionMenu,
    setShowActionMenu,
  } = useQuotesData();

  return (
    <div className='space-y-6'>
      {/* Header */}
      <motion.div
        initial='hidden'
        animate='visible'
        variants={fadeInUp}
        className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6'
      >
        <div>
          <h1 className='text-3xl font-semibold text-slate-900 flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-sm'>
              <FileText className='w-6 h-6 text-white' />
            </div>
            Quotes
          </h1>
          <p className='text-slate-600 mt-1'>
            Manage your quotes and proposals
          </p>
        </div>
        <button
          onClick={() => router.push('/contractor/quotes/create')}
          className='flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200'
        >
          <Plus className='w-5 h-5' />
          Create Quote
        </button>
      </motion.div>

      <QuotesStatsGrid stats={stats} />

      <QuotesFilterBar
        filterTabs={filterTabs}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Quotes Grid */}
      <AnimatePresence mode='wait'>
        {loading ? (
          <motion.div
            key='loading'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center'
          >
            <div className='flex items-center justify-center gap-3'>
              <div className='w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin' />
              <span className='text-slate-600'>Loading quotes...</span>
            </div>
          </motion.div>
        ) : filteredQuotes.length === 0 ? (
          <motion.div
            key='empty'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center'
          >
            <div className='max-w-md mx-auto'>
              <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <FileText className='w-8 h-8 text-gray-400' />
              </div>
              <h3 className='text-xl font-semibold text-slate-900 mb-2'>
                No quotes found
              </h3>
              <p className='text-slate-600 mb-6'>
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first quote to get started'}
              </p>
              {!searchQuery && activeFilter === 'all' && (
                <button
                  onClick={() => router.push('/contractor/quotes/create')}
                  className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-xl transition-all duration-200'
                >
                  <Plus className='w-5 h-5' /> Create Your First Quote
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key='quotes'
            variants={staggerContainer}
            initial='hidden'
            animate='visible'
            className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          >
            {filteredQuotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                showActionMenu={showActionMenu}
                onToggleMenu={setShowActionMenu}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
