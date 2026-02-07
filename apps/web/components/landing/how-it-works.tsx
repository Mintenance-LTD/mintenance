import React from 'react';
import Link from 'next/link';

const STEPS = [
  {
    number: 1,
    title: 'Post Your Job',
    description:
      'Describe your project in detail, upload photos, and set your budget. It takes less than 5 minutes.',
    gradient: 'from-slate-900 to-slate-800',
  },
  {
    number: 2,
    title: 'Compare Bids',
    description:
      'Receive competitive quotes from verified contractors. Review profiles, ratings, and portfolios.',
    gradient: 'from-teal-600 to-teal-500',
  },
  {
    number: 3,
    title: 'Hire & Complete',
    description:
      'Choose the best contractor, track progress, and release payment once you\'re satisfied with the work.',
    gradient: 'from-amber-500 to-amber-600',
  },
];

/**
 * How it works section - three step process
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">How it works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get your home project done in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {STEPS.map((step) => (
            <div key={step.number} className="text-center">
              <div
                className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${step.gradient} text-white text-4xl font-bold mb-6 shadow-lg`}
              >
                {step.number}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <Link
            href="/jobs/create"
            className="inline-flex px-10 py-5 bg-amber-500 text-white text-lg font-bold rounded-2xl hover:bg-amber-600 hover:shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </section>
  );
}
