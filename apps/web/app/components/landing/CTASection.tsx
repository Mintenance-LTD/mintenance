'use client';

import Link from 'next/link';

/**
 * Call-to-action section encouraging user registration
 */
export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-[#10B981] to-[#059669]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-6">
          <img src="/assets/icon.png" alt="Mintenance" className="w-16 h-16" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-white/90 mb-10">
          Join thousands of satisfied homeowners and skilled tradespeople on our platform
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/register?role=homeowner"
            className="bg-white text-[#10B981] px-10 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            I'm a Homeowner
          </Link>
          <Link
            href="/register?role=contractor"
            className="bg-[#0F172A] text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-[#1e293b] transition-colors shadow-lg"
          >
            I'm a Tradesperson
          </Link>
        </div>
      </div>
    </section>
  );
}
