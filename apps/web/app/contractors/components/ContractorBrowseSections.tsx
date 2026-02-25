'use client';

import Link from 'next/link';
import {
  Search,
  Shield,
  BadgeCheck,
  Users,
  FileCheck,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

export function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-10 h-10 text-teal-600" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">No contractors found</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        We couldn&apos;t find any contractors matching your criteria. Try adjusting your filters or search terms.
      </p>
      <button
        onClick={onClearFilters}
        className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Clear All Filters
      </button>
    </div>
  );
}

export function TrustSection() {
  const trustFeatures = [
    {
      icon: Shield,
      title: 'Background Checks',
      description: 'Every contractor undergoes thorough background verification before joining our platform.',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      icon: BadgeCheck,
      title: 'Insurance Verified',
      description: 'All professionals carry valid insurance and licensing for your peace of mind.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Users,
      title: 'Review System',
      description: 'Read authentic reviews from real homeowners to make informed decisions.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: FileCheck,
      title: 'Payment Protection',
      description: 'Secure escrow system ensures your payment is protected until work is complete.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  return (
    <section className="bg-gradient-to-br from-gray-50 to-gray-100 py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-teal-700">Your Safety First</span>
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Why Choose Verified Contractors?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We take the guesswork out of hiring. Every contractor on our platform is vetted, verified, and trusted by thousands of homeowners.
          </p>
        </div>

        {/* Trust Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                100%
              </div>
              <div className="text-sm text-gray-600 font-medium">Verified Professionals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                £2M+
              </div>
              <div className="text-sm text-gray-600 font-medium">Protected Payments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                24/7
              </div>
              <div className="text-sm text-gray-600 font-medium">Customer Support</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                98%
              </div>
              <div className="text-sm text-gray-600 font-medium">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(20, 184, 166, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)'
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Need Help Choosing the Right Contractor?
        </h2>

        {/* Description */}
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Post your job and let verified contractors come to you. Get competitive quotes, compare portfolios, and hire with confidence.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/jobs/create"
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center gap-2 group"
          >
            <span>Post Your Job Free</span>
            <TrendingUp className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/how-it-works"
            className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200"
          >
            Learn How It Works
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span>Free to post jobs</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span>Get quotes in 24 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span>Payment protection included</span>
          </div>
        </div>
      </div>
    </section>
  );
}
