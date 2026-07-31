'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Eye,
  Send,
  Edit,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Invoice,
  formatCurrency,
  formatDate,
  getRelativeDate,
  getInitials,
} from './types';
import { StatusBadge } from './StatusBadge';
import { ActionMenu } from './ActionMenu';

// Invoice Card Component - Calendar styling
export const InvoiceCard = ({
  invoice,
  onSend,
  onMarkPaid,
  onRemind,
  onDelete,
  onDownloadPDF,
}: {
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
      <div className='p-6'>
        {/* Header Row */}
        <div className='flex items-start justify-between mb-4'>
          <div className='flex items-start gap-4'>
            {/* Client Avatar */}
            <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-teal-700 font-semibold text-sm'>
              {getInitials(invoice.client_name)}
            </div>

            {/* Invoice Info */}
            <div>
              <div className='flex items-center gap-2 mb-1'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  #{invoice.invoice_number}
                </h3>
                <StatusBadge status={invoice.status} />
              </div>
              <p className='text-sm font-medium text-gray-900'>
                {invoice.client_name}
              </p>
              {invoice.client_email && (
                <p className='text-xs text-gray-500 mt-0.5'>
                  {invoice.client_email}
                </p>
              )}
            </div>
          </div>

          <ActionMenu
            invoice={invoice}
            onSend={onSend}
            onMarkPaid={onMarkPaid}
            onRemind={onRemind}
            onDelete={onDelete}
            onDownloadPDF={onDownloadPDF}
          />
        </div>

        {/* Divider */}
        <div className='h-px bg-gray-200 my-4' />

        {/* Amount and Dates Row */}
        <div className='flex items-end justify-between'>
          <div className='space-y-3'>
            {/* Amount */}
            <div>
              <p className='text-xs font-medium text-gray-500 mb-1'>
                Total Amount
              </p>
              <p className='text-3xl font-semibold text-gray-900'>
                {formatCurrency(invoice.total_amount)}
              </p>
              {invoice.status === 'partial' && invoice.paid_amount && (
                <p className='text-sm text-gray-600 mt-1'>
                  {formatCurrency(invoice.paid_amount)} paid
                </p>
              )}
            </div>

            {/* Dates */}
            <div className='flex items-center gap-6 text-sm'>
              {invoice.issue_date && (
                <div className='flex items-center gap-2 text-gray-600'>
                  <Calendar className='w-4 h-4' />
                  <span>Issued {formatDate(invoice.issue_date)}</span>
                </div>
              )}
              <div
                className={`flex items-center gap-2 font-medium ${
                  isOverdue
                    ? 'text-red-600'
                    : isPaid
                      ? 'text-green-600'
                      : 'text-gray-900'
                }`}
              >
                <Clock className='w-4 h-4' />
                <span>{getRelativeDate(invoice.due_date)}</span>
              </div>
            </div>
          </div>

          {/* Smart CTAs based on status */}
          <div className='flex items-center gap-2'>
            {isDraft && (
              <>
                {/* Audit follow-up (2026-04-29): the web route
                    `/invoices/[id]/edit` doesn't exist; invoice
                    editing is mobile-only via the
                    `CreateInvoiceScreen` editor mode (it accepts an
                    `invoiceId` route param to enter edit mode). Web
                    "Edit" now opens the read view (`[invoiceId]`,
                    note the param name) so the click does something
                    instead of 404'ing — re-link to the dedicated
                    edit page once it ships. */}
                <Link href={`/invoices/${invoice.id}`}>
                  <button className='px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm'>
                    <Edit className='w-4 h-4 inline mr-1.5' />
                    Edit
                  </button>
                </Link>
                <button
                  onClick={() => onSend(invoice.id)}
                  className='px-5 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-all text-sm'
                >
                  <Send className='w-4 h-4 inline mr-1.5' />
                  Send
                </button>
              </>
            )}

            {(invoice.status === 'sent' || invoice.status === 'partial') && (
              <>
                <button
                  onClick={() => onRemind(invoice.id)}
                  className='px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm'
                >
                  <Send className='w-4 h-4 inline mr-1.5' />
                  Remind
                </button>
                <button
                  onClick={() => onMarkPaid(invoice.id)}
                  className='px-5 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-all text-sm'
                >
                  <CheckCircle className='w-4 h-4 inline mr-1.5' />
                  Mark Paid
                </button>
              </>
            )}

            {isOverdue && (
              <>
                <button
                  onClick={() => onRemind(invoice.id)}
                  className='px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-all text-sm'
                >
                  <AlertCircle className='w-4 h-4 inline mr-1.5' />
                  Send Reminder
                </button>
                <button
                  onClick={() => onMarkPaid(invoice.id)}
                  className='px-4 py-2.5 rounded-lg border border-green-300 text-green-700 font-medium hover:bg-green-50 transition-all text-sm'
                >
                  <CheckCircle className='w-4 h-4 inline mr-1.5' />
                  Mark Paid
                </button>
              </>
            )}

            {isPaid && (
              <>
                <Link href={`/invoices/${invoice.id}`}>
                  <button className='px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm'>
                    <Eye className='w-4 h-4 inline mr-1.5' />
                    View
                  </button>
                </Link>
                <button
                  onClick={() => onDownloadPDF(invoice.id)}
                  className='px-5 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-all text-sm'
                >
                  <Download className='w-4 h-4 inline mr-1.5' />
                  Download
                </button>
              </>
            )}

            {invoice.status === 'cancelled' && (
              <Link href={`/invoices/${invoice.id}`}>
                <button className='px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all text-sm'>
                  <Eye className='w-4 h-4 inline mr-1.5' />
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
