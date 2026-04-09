'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Eye,
  Edit,
  Send,
  Copy,
  Trash2,
  MoreVertical,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  FileX,
  User,
  ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import type { Quote } from './useQuotesData';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const STATUS_CONFIGS = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: FileText,
    dotColor: 'bg-gray-500',
  },
  sent: {
    label: 'Sent',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Clock,
    dotColor: 'bg-amber-500',
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    icon: CheckCircle,
    dotColor: 'bg-teal-500',
  },
  declined: {
    label: 'Declined',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
    dotColor: 'bg-red-500',
  },
  expired: {
    label: 'Expired',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: FileX,
    dotColor: 'bg-orange-500',
  },
} as const;

interface QuoteCardProps {
  quote: Quote;
  showActionMenu: string | null;
  onToggleMenu: (id: string | null) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function QuoteCard({
  quote,
  showActionMenu,
  onToggleMenu,
}: QuoteCardProps) {
  const router = useRouter();
  const config = STATUS_CONFIGS[quote.status];

  const handleView = () => router.push(`/contractor/quotes/${quote.id}`);
  const handleEdit = () => router.push(`/contractor/quotes/${quote.id}/edit`);
  const handleSend = () => {
    toast.success(`Quote sent to ${quote.customerName}`);
    onToggleMenu(null);
  };
  const handleDuplicate = () => {
    toast.success('Quote duplicated');
    onToggleMenu(null);
  };
  const handleDownload = () => {
    toast.success('Downloading PDF...');
    onToggleMenu(null);
  };
  const handleDelete = () => {
    if (confirm(`Delete quote "${quote.jobTitle}"?`)) {
      toast.success('Quote deleted');
      onToggleMenu(null);
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      whileHover='hover'
      initial='rest'
      className='bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden group'
    >
      {/* Header */}
      <div className='p-8 border-b border-slate-100'>
        <div className='flex items-start justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <div
              className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`}
            />
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}
            >
              {config.label}
            </span>
          </div>
          <div className='relative'>
            <button
              onClick={() =>
                onToggleMenu(showActionMenu === quote.id ? null : quote.id)
              }
              className='p-1.5 rounded-xl hover:bg-gray-100 transition-all'
            >
              <MoreVertical className='w-4 h-4 text-slate-600' />
            </button>
            <AnimatePresence>
              {showActionMenu === quote.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className='absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl z-10 overflow-hidden'
                >
                  <button
                    onClick={handleView}
                    className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all'
                  >
                    <Eye className='w-4 h-4' /> View Details
                  </button>
                  {quote.status === 'draft' && (
                    <button
                      onClick={handleEdit}
                      className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all'
                    >
                      <Edit className='w-4 h-4' /> Edit Quote
                    </button>
                  )}
                  {(quote.status === 'draft' || quote.status === 'expired') && (
                    <button
                      onClick={handleSend}
                      className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all'
                    >
                      <Send className='w-4 h-4' /> Send Quote
                    </button>
                  )}
                  <button
                    onClick={handleDuplicate}
                    className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all'
                  >
                    <Copy className='w-4 h-4' /> Duplicate
                  </button>
                  <button
                    onClick={handleDownload}
                    className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-gray-50 transition-all'
                  >
                    <Download className='w-4 h-4' /> Download PDF
                  </button>
                  <div className='border-t border-slate-100' />
                  <button
                    onClick={handleDelete}
                    className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all'
                  >
                    <Trash2 className='w-4 h-4' /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <h3 className='font-semibold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-teal-600 transition-all'>
          {quote.jobTitle}
        </h3>
        <div className='flex items-center gap-2 text-sm text-slate-600'>
          <User className='w-4 h-4' />
          <span className='font-medium'>{quote.customerName}</span>
        </div>
      </div>

      {/* Body */}
      <div className='p-8 space-y-6'>
        <div>
          <p className='text-xs font-medium text-slate-500 mb-1'>
            Quote Amount
          </p>
          <p className='text-3xl font-semibold text-slate-900'>
            £{quote.amount.toLocaleString()}
          </p>
        </div>
        <div className='space-y-2 text-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-slate-600'>Items</span>
            <span className='font-semibold text-slate-900'>
              {quote.items || 0}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-slate-600'>Created</span>
            <span className='font-medium text-slate-900'>
              {formatDate(quote.createdDate)}
            </span>
          </div>
          {quote.sentDate && (
            <div className='flex items-center justify-between'>
              <span className='text-slate-600'>Sent</span>
              <span className='font-medium text-slate-900'>
                {formatDate(quote.sentDate)}
              </span>
            </div>
          )}
          {quote.expiryDate && (
            <div className='flex items-center justify-between'>
              <span className='text-slate-600'>Expires</span>
              <span className='font-medium text-slate-900'>
                {formatDate(quote.expiryDate)}
              </span>
            </div>
          )}
        </div>
        {quote.templateUsed && (
          <div className='pt-3 border-t border-slate-100'>
            <span className='inline-flex items-center gap-1.5 text-xs text-slate-600'>
              <FileText className='w-3.5 h-3.5' />
              {quote.templateUsed}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='px-8 pb-8'>
        {quote.status === 'draft' ? (
          <div className='grid grid-cols-2 gap-2'>
            <button
              onClick={handleEdit}
              className='flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium'
            >
              <Edit className='w-4 h-4' /> Edit
            </button>
            <button
              onClick={handleSend}
              className='flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-xl text-sm font-medium'
            >
              <Send className='w-4 h-4' /> Send
            </button>
          </div>
        ) : (
          <button
            onClick={handleView}
            className='w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium group'
          >
            <Eye className='w-4 h-4' /> View Details
            <ArrowUpRight className='w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all' />
          </button>
        )}
      </div>
    </motion.div>
  );
}
