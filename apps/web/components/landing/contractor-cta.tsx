import React from 'react';
import Link from 'next/link';

const BENEFITS = [
  {
    title: 'Real Jobs, Not Leads',
    description: 'See real posted jobs with budgets and details — no credits, no guessing',
  },
  {
    title: 'Guaranteed Payment',
    description: 'The homeowner\'s money is held securely before you pick up a tool. You will get paid.',
  },
  {
    title: 'Your Work Speaks for Itself',
    description: 'Photo proof protects you from bad-faith disputes. Verified badges show your credentials from day one.',
  },
];

const CONTRACTOR_PROMISES = [
  { label: 'No monthly fees', description: 'You only pay when you win a job' },
  { label: 'No credit system', description: 'See full job details before you bid' },
  { label: 'Payment protected', description: 'Funds secured before work begins' },
];

function CheckCircleIcon() {
  return (
    <svg className="w-6 h-6 text-teal-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}


/**
 * Contractor call-to-action section with benefits and stats
 */
export function ContractorCTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-5xl font-bold text-white mb-6">Are you a contractor?</h2>
            <p className="text-xl text-white/80 mb-10 leading-relaxed">
              We know you&apos;ve tried the others. Here&apos;s what&apos;s actually different: real jobs from real homeowners, payment secured before you start, and photo proof that protects your reputation.
            </p>

            <div className="space-y-6 mb-10">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title} className="flex items-start gap-4">
                  <CheckCircleIcon />
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                    <p className="text-white/70 leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/contractor/dashboard-enhanced"
              className="inline-flex px-10 py-5 bg-amber-500 text-white text-lg font-bold rounded-2xl hover:bg-amber-600 hover:shadow-2xl transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Join as a Contractor
            </Link>
          </div>

          <div className="relative">
            {/* Contractor app screenshot in device frame */}
            <div className="relative bg-gray-800 rounded-2xl p-2 shadow-2xl border border-white/10">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <div className="flex-1 mx-3 h-4 bg-gray-700 rounded" />
              </div>
              <div className="rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                  src="/screenshots/contractor/discover-jobs.png"
                  alt="Contractor Discover Jobs — map view with available jobs, trade filters, and Quick Bid"
                  width={700}
                  height={440}
                  className="w-full h-auto"
                />
              </div>
            </div>
            {/* Floating mobile */}
            <div className="absolute -bottom-6 -right-4 w-36 rounded-2xl overflow-hidden shadow-xl border-4 border-white/20 hidden lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/mobile/contractor-business-hub.png"
                alt="Mobile Business Hub — Finance, Invoices, Quotes, Clients"
                width={180}
                height={390}
                className="w-full h-auto"
              />
            </div>
            {/* Promise pills below */}
            <div className="flex flex-wrap gap-3 mt-8 justify-center">
              {CONTRACTOR_PROMISES.map((item) => (
                <div key={item.label} className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <CheckCircleIcon />
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
