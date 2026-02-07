import React from 'react';
import Link from 'next/link';

const BENEFITS = [
  {
    title: 'Quality Leads',
    description: 'Get matched with serious homeowners ready to hire',
  },
  {
    title: 'Grow Your Business',
    description: 'Build your reputation with reviews and referrals',
  },
  {
    title: 'Get Paid Faster',
    description: 'Secure payments released within 24 hours of completion',
  },
];

const CONTRACTOR_STATS = [
  { label: 'Average Monthly Earnings', value: '£4,250', growth: '+23%' },
  { label: 'Jobs per Month', value: '12', growth: '+15%' },
  { label: 'Customer Satisfaction', value: '98%', growth: '+5%' },
];

function CheckCircleIcon() {
  return (
    <svg className="w-6 h-6 text-teal-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L9 11.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0L11 10.586 14.586 7H13a1 1 0 01-1-1z" clipRule="evenodd" />
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
              Join thousands of professionals growing their business with Mintenance. Get quality leads, manage projects efficiently, and get paid faster.
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
            {CONTRACTOR_STATS.map((stat) => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <p className="text-white/70 text-sm font-medium mb-2">{stat.label}</p>
                <p className="text-5xl font-bold text-white mb-2">{stat.value}</p>
                <div className="flex items-center text-sm text-teal-400 font-medium">
                  <TrendUpIcon />
                  <span>{stat.growth}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
