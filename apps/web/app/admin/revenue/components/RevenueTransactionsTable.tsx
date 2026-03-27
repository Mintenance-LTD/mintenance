'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  type: string;
  jobTitle: string;
  contractor: string;
  homeowner: string;
  amount: number;
  fee: number;
  net: number;
  status: string;
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'job_payment':
      return 'bg-emerald-100 text-emerald-700';
    case 'subscription':
      return 'bg-indigo-100 text-indigo-700';
    case 'platform_fee':
      return 'bg-blue-100 text-blue-700';
    case 'refund':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

interface RevenueTransactionsTableProps {
  transactions: Transaction[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
}

export function RevenueTransactionsTable({
  transactions,
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
}: RevenueTransactionsTableProps) {
  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-gray-900'>
          Recent Transactions
        </h2>
        <div className='flex items-center gap-4'>
          <input
            type='text'
            placeholder='Search transactions...'
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onSearchChange(e.target.value)
            }
            aria-label='Search transactions'
            className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
          />
          <select
            value={selectedType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onTypeChange(e.target.value)
            }
            aria-label='Filter by transaction type'
            className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
          >
            <option value='all'>All Types</option>
            <option value='job_payment'>Job Payments</option>
            <option value='subscription'>Subscriptions</option>
            <option value='platform_fee'>Platform Fees</option>
            <option value='refund'>Refunds</option>
          </select>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-gray-200'>
              <th
                scope='col'
                className='text-left py-3 px-4 text-sm font-semibold text-gray-700'
              >
                ID
              </th>
              <th
                scope='col'
                className='text-left py-3 px-4 text-sm font-semibold text-gray-700'
              >
                Date
              </th>
              <th
                scope='col'
                className='text-left py-3 px-4 text-sm font-semibold text-gray-700'
              >
                Type
              </th>
              <th
                scope='col'
                className='text-left py-3 px-4 text-sm font-semibold text-gray-700'
              >
                Details
              </th>
              <th
                scope='col'
                className='text-right py-3 px-4 text-sm font-semibold text-gray-700'
              >
                Amount
              </th>
              <th
                scope='col'
                className='text-right py-3 px-4 text-sm font-semibold text-gray-700'
              >
                Fee
              </th>
              <th
                scope='col'
                className='text-right py-3 px-4 text-sm font-semibold text-gray-700'
              >
                Net
              </th>
              <th
                scope='col'
                className='text-center py-3 px-4 text-sm font-semibold text-gray-700'
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr
                key={txn.id}
                className='border-b border-gray-100 hover:bg-gray-50 transition-colors'
              >
                <td className='py-4 px-4 text-sm font-medium text-gray-900'>
                  {txn.id}
                </td>
                <td className='py-4 px-4 text-sm text-gray-600'>{txn.date}</td>
                <td className='py-4 px-4'>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(txn.type)}`}
                  >
                    {txn.type.replace('_', ' ')}
                  </span>
                </td>
                <td className='py-4 px-4'>
                  <div className='text-sm'>
                    <p className='font-medium text-gray-900'>{txn.jobTitle}</p>
                    <p className='text-gray-500 text-xs'>
                      {txn.contractor} → {txn.homeowner}
                    </p>
                  </div>
                </td>
                <td className='py-4 px-4 text-right text-sm font-semibold text-gray-900'>
                  £{Math.abs(txn.amount).toLocaleString()}
                </td>
                <td className='py-4 px-4 text-right text-sm text-gray-600'>
                  £{Math.abs(txn.fee).toLocaleString()}
                </td>
                <td className='py-4 px-4 text-right text-sm font-semibold text-emerald-600'>
                  £{Math.abs(txn.net).toLocaleString()}
                </td>
                <td className='py-4 px-4 text-center'>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}
                  >
                    {txn.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions.length === 0 && (
        <div className='text-center py-12'>
          <DollarSign className='w-12 h-12 text-gray-400 mx-auto mb-4' />
          <p className='text-gray-500'>No transactions found</p>
        </div>
      )}
    </div>
  );
}
