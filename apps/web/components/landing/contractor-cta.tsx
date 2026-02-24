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
                    <h4 className="text-xl font-bold text-white mb-2">{benefit.title}</h4>
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

          <div className="grid gap-6">
            {CONTRACTOR_PROMISES.map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <p className="text-2xl font-bold text-white mb-2">{item.label}</p>
                <p className="text-white/70 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
