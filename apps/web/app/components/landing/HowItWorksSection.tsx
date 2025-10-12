'use client';

import Image from 'next/image';

/**
 * How It Works section explaining the platform process
 */
export function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: 'Post Your Job',
      description: 'Describe your home maintenance or repair needs with photos and details. It takes less than 2 minutes.',
      color: '#10B981',
      icon: (
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      mockup: (
        <div className="relative mx-auto w-48 h-[300px] bg-black rounded-[2rem] p-1 shadow-lg">
          <div className="w-full h-full bg-white rounded-[1.5rem] overflow-hidden">
            <div className="p-3">
              <div className="text-center mb-3">
                <h4 className="text-sm font-bold text-[#0F172A]">Post a Job</h4>
              </div>
              <div className="space-y-2">
                <div className="bg-gray-100 rounded p-2">
                  <p className="text-xs font-semibold">Kitchen tap repair</p>
                  <p className="text-xs text-gray-600">Urgent - leaking tap</p>
                </div>
                <div className="bg-gray-100 rounded p-2">
                  <p className="text-xs font-semibold">Budget: £100-£200</p>
                  <p className="text-xs text-gray-600">Location: London</p>
                </div>
                <button className="w-full bg-[#10B981] text-white text-xs py-2 rounded">Post Job</button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 2,
      title: 'Receive Quotes',
      description: 'Qualified tradespeople in your area will submit competitive quotes. Compare and choose the best fit.',
      color: '#F59E0B',
      icon: (
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      mockup: (
        <div className="space-y-3">
          {[
            { name: 'Mike Johnson', price: '£120', availability: 'Available today', initials: 'MJ', color: '#10B981' },
            { name: 'Sarah Clarke', price: '£150', availability: 'Available tomorrow', initials: 'SC', color: '#F59E0B' },
          ].map((quote) => (
            <div key={quote.name} className="bg-white rounded-lg p-3 shadow-lg border mx-auto max-w-xs">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: quote.color }}>
                    <span className="text-white text-xs">{quote.initials}</span>
                  </div>
                  <span className="text-xs font-semibold">{quote.name}</span>
                </div>
                <span className="text-xs text-[#10B981] font-bold">{quote.price}</span>
              </div>
              <p className="text-xs text-gray-600">{quote.availability}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      number: 3,
      title: 'Get It Done',
      description: 'Hire your chosen tradesperson, track progress, and pay securely through our platform when satisfied.',
      color: '#0F172A',
      icon: (
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      mockup: (
        <div className="bg-white rounded-lg p-4 shadow-lg border mx-auto max-w-xs">
          <div className="text-center mb-3">
            <h4 className="text-sm font-semibold text-[#0F172A]">Job Progress</h4>
            <p className="text-xs text-gray-600">Kitchen tap repair</p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Job accepted', done: true },
              { label: 'Tradesperson en route', done: true },
              { label: 'Work in progress', done: false },
            ].map((step, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.done ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}>
                  <span className="text-white text-xs">{step.done ? '✓' : '⚡'}</span>
                </div>
                <span className="text-xs">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Image src="/assets/icon.png" alt="Mintenance" width={48} height={48} className="w-12 h-12" />
            <h2 className="text-4xl font-bold text-[#0F172A]">How It Works</h2>
          </div>
          <p className="text-xl text-gray-600">Getting started is simple and straightforward</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {steps.map((step) => (
            <div key={step.number} className="text-center relative">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10" style={{ backgroundColor: step.color }}>
                {step.icon}
              </div>
              <h3 className="text-2xl font-semibold text-[#0F172A] mb-3">{step.number}. {step.title}</h3>
              <p className="text-gray-600 mb-6">{step.description}</p>
              {step.mockup}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

