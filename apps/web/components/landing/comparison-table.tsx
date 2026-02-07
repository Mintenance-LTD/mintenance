import React from 'react';
import Link from 'next/link';

function CrossIcon() {
  return (
    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

const COMPARISON_ROWS = [
  {
    feature: 'Damage Assessment',
    traditional: 'Wait 3-5 days for quotes',
    mintenance: 'Instant AI analysis',
  },
  {
    feature: 'Cost Estimate',
    traditional: 'Unknown until bids arrive',
    mintenance: 'AI estimate in 60 seconds',
  },
  {
    feature: 'Contractor Matching',
    traditional: 'Manual search, cold calling',
    mintenance: 'Swipe right to hire',
  },
  {
    feature: 'Payment Protection',
    traditional: 'Upfront payment (risky)',
    mintenance: 'Escrow until completion',
  },
];

/**
 * Comparison table showing Mintenance vs traditional methods
 */
export function ComparisonTable() {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Why Mintenance Beats Traditional Methods</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how AI-powered automation saves you time and money
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <th className="px-6 py-4 text-left text-lg font-bold">Feature</th>
                <th className="px-6 py-4 text-left text-lg font-bold">Traditional Method</th>
                <th className="px-6 py-4 text-left text-lg font-bold bg-teal-600">
                  <div className="flex items-center gap-2">
                    Mintenance
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 font-semibold text-gray-900">{row.feature}</td>
                  <td className="px-6 py-5 text-gray-600">
                    <div className="flex items-start gap-2">
                      <CrossIcon />
                      <span>{row.traditional}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 bg-teal-50">
                    <div className="flex items-start gap-2">
                      <CheckIcon />
                      <strong className="text-teal-900">{row.mintenance}</strong>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/register"
            className="inline-flex px-10 py-5 bg-teal-600 text-white text-lg font-bold rounded-2xl hover:bg-teal-700 hover:shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Experience the Difference
          </Link>
        </div>
      </div>
    </section>
  );
}
