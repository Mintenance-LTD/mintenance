'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, ChevronDown, Star, Shield, Zap, TrendingUp } from 'lucide-react';

const categories = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Roofing',
  'Landscaping',
];

/**
 * Hero Section - Fixed version without framer-motion to debug loading issue
 * This version uses CSS animations instead of framer-motion
 */
export function HeroSectionFixed() {
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Plumbing');
  const [location, setLocation] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#0066CC] via-[#0052A3] to-[#003D7A]">
        <div className="container mx-auto px-4 text-center text-white">
          <div className="animate-pulse">
            <div className="h-16 w-3/4 mx-auto bg-white/10 rounded mb-6"></div>
            <div className="h-8 w-1/2 mx-auto bg-white/10 rounded"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#0066CC] via-[#0052A3] to-[#003D7A]">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"
          style={{ animation: 'grid-flow 20s linear infinite' }}
        />
      </div>

      {/* Floating Orbs - CSS animation instead of framer-motion */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#10B981] rounded-full filter blur-3xl opacity-20 animate-float-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400 rounded-full filter blur-3xl opacity-20 animate-float-slower" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center opacity-0 animate-fade-in">
          {/* Left Column - Hero Content */}
          <div className="text-white">
            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-4 mb-6 opacity-0 animate-fade-in-delay-1">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Star className="w-5 h-5 text-[#10B981]" fill="currentColor" />
                <span className="text-sm font-medium">10,000+ Happy Customers</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Shield className="w-5 h-5 text-[#10B981]" />
                <span className="text-sm font-medium">Verified Contractors</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 opacity-0 animate-fade-in-delay-2">
              Find Trusted{' '}
              <span className="bg-gradient-to-r from-[#10B981] to-teal-400 bg-clip-text text-transparent">
                Contractors
              </span>{' '}
              Near You
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-white/90 mb-8 leading-relaxed opacity-0 animate-fade-in-delay-3">
              Connect with vetted professionals for your home improvement projects. Get quotes, compare services, and hire with confidence.
            </p>

            {/* Search Box */}
            <div className="bg-white rounded-2xl shadow-2xl p-2 opacity-0 animate-fade-in-delay-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                {/* Category Select */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-14 pl-12 pr-10 rounded-xl border-0 focus:ring-2 focus:ring-[#0066CC] bg-gray-50 text-gray-900 font-medium appearance-none cursor-pointer"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>

                {/* Location Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <MapPin className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your postcode"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 rounded-xl border-0 focus:ring-2 focus:ring-[#0066CC] bg-gray-50 text-gray-900 font-medium placeholder:text-gray-400"
                  />
                </div>

                {/* Search Button */}
                <Link
                  href={`/contractors?category=${selectedCategory}&location=${location}`}
                  className="h-14 px-8 bg-gradient-to-r from-[#0066CC] to-[#0052A3] hover:from-[#0052A3] hover:to-[#003D7A] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Search className="w-5 h-5" />
                  <span className="hidden sm:inline">Search</span>
                </Link>
              </div>

              {/* Popular Searches */}
              <div className="mt-4 px-2">
                <p className="text-sm text-gray-500 mb-2">Popular searches:</p>
                <div className="flex flex-wrap gap-2">
                  {['Emergency Plumber', 'Electrician', 'Carpenter', 'Painter'].map((term) => (
                    <button
                      key={term}
                      onClick={() => setSelectedCategory(term.split(' ')[1] || term)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8 opacity-0 animate-fade-in-delay-5">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-3xl font-bold mb-1">
                  <Zap className="w-6 h-6 text-[#10B981]" />
                  <span>2.5K+</span>
                </div>
                <p className="text-sm text-white/70">Active Contractors</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-3xl font-bold mb-1">
                  <TrendingUp className="w-6 h-6 text-[#10B981]" />
                  <span>95%</span>
                </div>
                <p className="text-sm text-white/70">Satisfaction Rate</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-3xl font-bold mb-1">
                  <Shield className="w-6 h-6 text-[#10B981]" />
                  <span>24/7</span>
                </div>
                <p className="text-sm text-white/70">Support</p>
              </div>
            </div>
          </div>

          {/* Right Column - Visual Placeholder */}
          <div className="hidden lg:flex items-center justify-center opacity-0 animate-fade-in-delay-3">
            <div className="relative w-full max-w-2xl aspect-[3/2] rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/50 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5" />
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xl font-semibold">
                Hero Animation Placeholder
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes grid-flow {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(4rem);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(50px, 30px) scale(1.1);
          }
        }

        @keyframes float-slower {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, -50px) scale(1.2);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-fade-in-delay-1 {
          animation: fade-in 0.6s ease-out 0.2s forwards;
        }

        .animate-fade-in-delay-2 {
          animation: fade-in 0.6s ease-out 0.4s forwards;
        }

        .animate-fade-in-delay-3 {
          animation: fade-in 0.6s ease-out 0.6s forwards;
        }

        .animate-fade-in-delay-4 {
          animation: fade-in 0.6s ease-out 0.8s forwards;
        }

        .animate-fade-in-delay-5 {
          animation: fade-in 0.6s ease-out 1s forwards;
        }

        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }

        .animate-float-slower {
          animation: float-slower 12s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
