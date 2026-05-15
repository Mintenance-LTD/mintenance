'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Calendar,
  Eye,
  CheckCircle,
  Clock,
  FileText,
  PoundSterling,
} from 'lucide-react';
import type { Transaction } from './types';

interface TransactionsTableProps {
  filteredTransactions: Transaction[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterStatus: 'all' | 'pending' | 'completed';
  setFilterStatus: (s: 'all' | 'pending' | 'completed') => void;
  onViewDetails: (transaction: Transaction) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'released':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'held':
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
    case 'released':
      return <CheckCircle className='w-4 h-4' />;
    case 'held':
    case 'pending':
      return <Clock className='w-4 h-4' />;
    default:
      return <FileText className='w-4 h-4' />;
  }
};

export function TransactionsTable({
  filteredTransactions,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  onViewDetails,
}: TransactionsTableProps) {
  // 2026-05-13 polish pass: editorial-branched shell + filter pills +
  // table header. Row internals stay the same — they read fine on
  // either theme through .me-legacy-fit colour mapping.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  return (
    <div
      className={
        isMintEditorial
          ? 'card card-pad'
          : 'bg-white rounded-xl border border-gray-200 p-6 mb-6'
      }
      style={isMintEditorial ? { marginBottom: 16 } : undefined}
    >
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2
            className={
              isMintEditorial ? 't-h3' : 'text-lg font-semibold text-gray-900'
            }
          >
            Recent transactions
          </h2>
          <p
            className={
              isMintEditorial ? 't-meta' : 'text-sm text-gray-600 mt-1'
            }
            style={isMintEditorial ? { marginTop: 2 } : undefined}
          >
            View and manage your payment history
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-4 mb-6'>
        <div className='relative flex-1'>
          <Search
            className={
              isMintEditorial
                ? 'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4'
                : 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5'
            }
            style={isMintEditorial ? { color: 'var(--me-ink-3)' } : undefined}
          />
          <input
            type='text'
            placeholder='Search transactions...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={
              isMintEditorial
                ? 'field'
                : 'w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all'
            }
            style={isMintEditorial ? { paddingLeft: 36 } : undefined}
          />
        </div>
        {isMintEditorial ? (
          <div className='flex gap-2'>
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'completed', label: 'Completed' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={filterStatus === key ? 'chip on' : 'chip'}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className='flex gap-2'>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'completed'
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
          </div>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className='text-center py-16 border-2 border-dashed border-gray-200 rounded-xl'>
          <PoundSterling className='w-16 h-16 text-gray-300 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            No transactions found
          </h3>
          <p className='text-gray-500'>
            Your completed jobs and payments will appear here
          </p>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-lg border border-gray-200'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='text-left py-4 px-6 text-sm font-semibold text-gray-900'>
                  Date
                </th>
                <th className='text-left py-4 px-6 text-sm font-semibold text-gray-900'>
                  Job
                </th>
                <th className='text-left py-4 px-6 text-sm font-semibold text-gray-900'>
                  Client
                </th>
                <th className='text-right py-4 px-6 text-sm font-semibold text-gray-900'>
                  Amount
                </th>
                <th className='text-center py-4 px-6 text-sm font-semibold text-gray-900'>
                  Status
                </th>
                <th className='text-right py-4 px-6 text-sm font-semibold text-gray-900'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className='hover:bg-gray-50 transition-colors'
                >
                  <td className='py-4 px-6 text-sm text-gray-600'>
                    <div className='flex items-center gap-2'>
                      <Calendar className='w-4 h-4 text-gray-400' />
                      {new Date(transaction.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className='py-4 px-6'>
                    <p className='text-sm font-medium text-gray-900'>
                      {transaction.jobTitle}
                    </p>
                    <p className='text-xs text-gray-500'>
                      ID: {transaction.jobId.slice(0, 8)}
                    </p>
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-600'>
                    {transaction.client}
                  </td>
                  <td className='py-4 px-6 text-right'>
                    <p className='text-sm font-semibold text-gray-900'>
                      £{transaction.netAmount.toFixed(2)}
                    </p>
                    <p className='text-xs text-gray-500'>
                      of £{transaction.amount.toFixed(2)}
                    </p>
                  </td>
                  <td className='py-4 px-6'>
                    <div className='flex justify-center'>
                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(transaction.status)}`}
                      >
                        {getStatusIcon(transaction.status)}
                        {transaction.status}
                      </span>
                    </div>
                  </td>
                  <td className='py-4 px-6 text-right'>
                    <button
                      onClick={() => onViewDetails(transaction)}
                      className='text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 ml-auto'
                    >
                      <Eye className='w-4 h-4' />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
