'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Send,
  Edit,
  Download,
  Trash2,
  CheckCircle,
  MoreVertical,
} from 'lucide-react';
import { Invoice, InvoiceAction } from './types';

// Action Menu Component - lighter styling
export const ActionMenu = ({ invoice, onSend, onMarkPaid, onRemind, onDelete, onDownloadPDF }: {
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
