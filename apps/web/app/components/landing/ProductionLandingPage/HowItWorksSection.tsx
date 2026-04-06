'use client';

import { Search, Users, CheckCircle } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      step: '1',
      icon: <Search className="w-8 h-8" />,
      title: 'Post Your Job',
      description: 'Tell us what you need. Share photos, set your budget, and describe your project in detail.',
    },
    {
      step: '2',
      icon: <Users className="w-8 h-8" />,
      title: 'Get Matched',
      description: 'Receive quotes from verified contractors. Compare reviews, prices, and portfolios side-by-side.',
    },
    {
      step: '3',
      icon: <CheckCircle className="w-8 h-8" />,
      title: 'Hire with Confidence',
      description: 'Choose the best contractor for your needs. Track progress and pay securely through escrow.',
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-gray-50" data-animate>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How Mintenance Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Finding the right contractor has never been easier. Just three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="text-center hover-lift"
              data-animate
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500 text-white rounded-2xl mb-6">
                {step.icon}
              </div>
              <div className="relative mb-6">
                <div className="absolute -top-8 -right-4 w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-teal-600">{step.step}</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
