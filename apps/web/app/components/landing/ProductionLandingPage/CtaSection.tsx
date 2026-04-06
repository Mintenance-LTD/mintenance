'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section
      className="py-20 sm:py-24 bg-gradient-to-br from-teal-500 to-emerald-600 relative overflow-hidden"
      data-animate
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to start your project?
          </h2>
          <p className="text-xl text-white/90 mb-10 leading-relaxed">
            Join thousands of homeowners who found their perfect contractor on Mintenance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/jobs/create"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-teal-600 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
            >
              Post a Job
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/contractors"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white border-2 border-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Browse Contractors
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
