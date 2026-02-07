import React from 'react';
import Link from 'next/link';

/**
 * Final call-to-action section at the bottom of the landing page
 */
export function FinalCTA() {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">Ready to get started?</h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Join thousands of homeowners and contractors who trust Mintenance for their home maintenance projects.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <Link
            href="/jobs/create"
            className="px-10 py-5 bg-slate-900 text-white text-lg font-bold rounded-2xl hover:bg-slate-800 hover:shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Post Your First Job
          </Link>
          <Link
            href="/contractors"
            className="px-10 py-5 bg-gray-100 text-gray-900 text-lg font-bold rounded-2xl hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Browse Contractors
          </Link>
        </div>
      </div>
    </section>
  );
}
