'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';
import type { ReportingAnalytics } from './types';

interface TablesSectionProps {
  analytics: ReportingAnalytics;
}

export const TablesSection: React.FC<TablesSectionProps> = ({ analytics }) => {
  return (
    <>
      {/* Category Breakdown Table */}
      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        <div className='p-6 border-b border-gray-200'>
          <h2 className='text-xl font-semibold text-gray-900 mb-1'>
            Detailed Category Breakdown
          </h2>
          <p className='text-sm text-gray-500'>
            Complete performance data by service category
          </p>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='text-left py-4 px-6 font-semibold text-sm text-gray-700'>
                  Category
                </th>
                <th className='text-right py-4 px-6 font-semibold text-sm text-gray-700'>
                  Total Jobs
                </th>
                <th className='text-right py-4 px-6 font-semibold text-sm text-gray-700'>
                  Total Revenue
                </th>
                <th className='text-right py-4 px-6 font-semibold text-sm text-gray-700'>
                  Avg Job Value
                </th>
                <th className='text-right py-4 px-6 font-semibold text-sm text-gray-700'>
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {analytics.jobsByCategory
                .sort((a, b) => b.revenue - a.revenue)
                .map((category, index) => {
                  const percentage =
                    (category.revenue / analytics.totalRevenue) * 100;
                  const avgValue =
                    category.count > 0 ? category.revenue / category.count : 0;

                  return (
                    <tr
                      key={category.category}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='py-4 px-6'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              index === 0
                                ? 'bg-teal-500'
                                : index === 1
                                  ? 'bg-green-500'
                                  : index === 2
                                    ? 'bg-blue-500'
                                    : 'bg-gray-400'
                            }`}
                          />
                          <span className='font-medium text-gray-900'>
                            {category.category}
                          </span>
                        </div>
                      </td>
                      <td className='py-4 px-6 text-right text-gray-700 font-medium'>
                        {category.count}
                      </td>
                      <td className='py-4 px-6 text-right font-semibold text-teal-600'>
                        {formatMoney(category.revenue, 'GBP')}
                      </td>
                      <td className='py-4 px-6 text-right text-gray-700'>
                        {formatMoney(avgValue, 'GBP')}
                      </td>
                      <td className='py-4 px-6 text-right'>
                        <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700'>
                          {percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Clients Table */}
      {analytics.topClients && analytics.topClients.length > 0 && (
        <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
          <div className='p-6 border-b border-gray-200'>
            <h2 className='text-xl font-semibold text-gray-900 mb-1'>
              Top Clients
            </h2>
            <p className='text-sm text-gray-500'>
              Your highest value clients by total revenue
            </p>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='text-left py-4 px-6 font-semibold text-sm text-gray-700'>
                    Client Name
                  </th>
                  <th className='text-right py-4 px-6 font-semibold text-sm text-gray-700'>
                    Total Jobs
                  </th>
                  <th className='text-right py-4 px-6 font-semibold text-sm text-gray-700'>
                    Total Revenue
                  </th>
                  <th className='text-right py-4 px-6 font-semibold text-sm text-gray-700'>
                    Average Job Value
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {analytics.topClients.map((client, index) => {
                  const avgValue =
                    client.jobs > 0 ? client.revenue / client.jobs : 0;
                  return (
                    <tr
                      key={index}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='py-4 px-6'>
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center'>
                            <Users className='w-5 h-5 text-gray-600' />
                          </div>
                          <span className='font-medium text-gray-900'>
                            {client.name || 'Unknown Client'}
                          </span>
                        </div>
                      </td>
                      <td className='py-4 px-6 text-right text-gray-700 font-medium'>
                        {client.jobs}
                      </td>
                      <td className='py-4 px-6 text-right font-semibold text-teal-600'>
                        {formatMoney(client.revenue, 'GBP')}
                      </td>
                      <td className='py-4 px-6 text-right text-gray-700'>
                        {formatMoney(avgValue, 'GBP')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};
