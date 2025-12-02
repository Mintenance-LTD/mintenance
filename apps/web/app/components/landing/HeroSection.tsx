'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, MapPin, ChevronDown, Star, Shield, Zap, TrendingUp } from 'lucide-react';
import { HeroAnimationWrapper } from './HeroAnimationWrapper';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const categories = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Roofing',
  'Landscaping',
];

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as any, // Cubic bezier easing for Framer Motion
      },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#0066CC] via-[#0052A3] to-[#003D7A]">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"
          style={
            !prefersReducedMotion && mounted
              ? { animation: 'grid-flow 20s linear infinite' }
              : undefined
          }
        />
      </div>

      {/* Floating Orbs */}
      {!prefersReducedMotion && mounted && (
        <>
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-[#10B981] rounded-full filter blur-3xl opacity-20"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400 rounded-full filter blur-3xl opacity-20"
            animate={{
              x: [0, -30, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-32 pb-20">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          initial="hidden"
          animate={mounted ? 'visible' : 'hidden'}
          variants={!prefersReducedMotion ? containerVariants : undefined}
        >
          {/* Left Column: Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Live Badge */}
            <motion.div
              variants={!prefersReducedMotion ? itemVariants : undefined}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
              </span>
              50,000+ Verified Tradespeople Online
            </motion.div>

            {/* Headline */}
            <motion.div variants={!prefersReducedMotion ? itemVariants : undefined}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                Find Trusted Tradespeople{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#4ADE80]">
                  in Minutes
                </span>
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                AI-powered matching connects you with verified professionals. Secure payments,
                guaranteed work, and instant damage assessment.
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              variants={!prefersReducedMotion ? itemVariants : undefined}
              className="bg-white rounded-2xl p-2 shadow-2xl max-w-2xl mx-auto lg:mx-0"
            >
              <div className="flex flex-col md:flex-row gap-2">
                {/* Category Dropdown */}
                <div className="flex-1 relative">
                  <select className="w-full h-14 px-4 pr-10 bg-gray-50 border-0 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0066CC] appearance-none cursor-pointer">
                    <option value="">What do you need?</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>

                {/* Location Input */}
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter postcode"
                    className="w-full h-14 pl-12 pr-4 bg-gray-50 border-0 rounded-xl text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                  />
                </div>

                {/* Search Button */}
                <Link
                  href="/jobs/create"
                  className="flex items-center justify-center gap-2 h-14 px-8 bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white font-bold rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0066CC] whitespace-nowrap"
                >
                  <Search className="w-5 h-5" />
                  <span className="hidden md:inline">Post Job</span>
                </Link>
              </div>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={!prefersReducedMotion ? itemVariants : undefined}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto lg:mx-0"
            >
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white mb-1">50K+</div>
                <div className="text-sm text-blue-200">Verified Pros</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white mb-1">1M+</div>
                <div className="text-sm text-blue-200">Jobs Completed</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-1 mb-1">
                  <span className="text-3xl font-bold text-white">4.8</span>
                  <Star className="w-6 h-6 fill-[#10B981] text-[#10B981]" />
                </div>
                <div className="text-sm text-blue-200">Average Rating</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white mb-1">£10M+</div>
                <div className="text-sm text-blue-200">Paid Securely</div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={!prefersReducedMotion ? itemVariants : undefined}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/register?role=homeowner"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold text-[#0066CC] bg-white rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-300 shadow-2xl hover:shadow-[#10B981]/20 hover:scale-105"
              >
                Post a Job
                <motion.span
                  className="inline-block"
                  animate={!prefersReducedMotion ? { x: [0, 4, 0] } : undefined}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </Link>
              <Link
                href="/contractors"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-all duration-300 hover:scale-105"
              >
                Browse Contractors
              </Link>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              variants={!prefersReducedMotion ? itemVariants : undefined}
              className="flex flex-wrap justify-center lg:justify-start gap-3"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Shield className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm font-medium text-white">Secure Escrow</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Zap className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm font-medium text-white">Instant Matching</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm font-medium text-white">AI Assessment</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Hero Animation */}
          <motion.div
            variants={!prefersReducedMotion ? itemVariants : undefined}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            <HeroAnimationWrapper />
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes grid-flow {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(4rem);
          }
        }
      `}</style>
    </section>
  );
}
