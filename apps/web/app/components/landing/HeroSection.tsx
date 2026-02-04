'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, MapPin, ChevronDown, Star, Shield, Zap, TrendingUp } from 'lucide-react';
import { HeroCard } from './HeroCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Hero categories; values match jobs/create serviceCategories for query-param prefilling */
const HERO_CATEGORIES = [
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Carpentry', value: 'carpentry' },
  { label: 'Painting', value: 'painting' },
  { label: 'Roofing', value: 'roofing' },
  { label: 'Gardening', value: 'gardening' },
  { label: 'Handyman', value: 'handyman' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'HVAC', value: 'hvac' },
] as const;

const EASE_SMOOTH: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface HeroSectionProps {
  /** Real active contractors count from API; only shown when hasRealStats is true */
  activeContractors?: number | null;
  /** True when stats came from /api/stats/platform (not fallbacks). Badge count shown only then. */
  hasRealStats?: boolean;
  /** True while platform stats are loading */
  statsLoading?: boolean;
}

export function HeroSection({ activeContractors = null, hasRealStats = false, statsLoading = false }: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [postcode, setPostcode] = useState<string>('');

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
        ease: EASE_SMOOTH,
      },
    },
  };

  const postJobHref = (() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (postcode.trim()) params.set('location', postcode.trim());
    const qs = params.toString();
    return qs ? `/jobs/create?${qs}` : '/jobs/create';
  })();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
            ...((!prefersReducedMotion && mounted) ? { animation: 'map-drift 60s linear infinite' } : {})
          }}
        />
      </div>

      {/* Floating Orbs */}
      {!prefersReducedMotion && mounted && (
        <>
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-teal-500 rounded-full filter blur-3xl opacity-20"
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
            className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500 rounded-full filter blur-3xl opacity-20"
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
          initial="visible"
          animate="visible"
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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400"></span>
              </span>
              {!statsLoading && hasRealStats && activeContractors != null
                ? `${Number(activeContractors).toLocaleString()}+ Verified Tradespeople Online`
                : 'Verified Tradespeople Online'}
            </motion.div>

            {/* Headline */}
            <motion.div variants={!prefersReducedMotion ? itemVariants : undefined}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                Mint AI{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
                  in 60 Seconds
                </span>
                . Instant Cost Estimates.
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Upload photos. Mint AI detects 71 damage types and suggests verified contractors. Swipe to hire.
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
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-14 px-4 pr-10 bg-gray-50 border-0 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
                    aria-label="Service category"
                  >
                    <option value="">What do you need?</option>
                    {HERO_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>

                {/* Location Input */}
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden />
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="Enter postcode"
                    className="w-full h-14 pl-12 pr-4 bg-gray-50 border-0 rounded-xl text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    aria-label="Postcode or location"
                  />
                </div>

                {/* Search Button */}
                <Link
                  href={postJobHref}
                  className="flex items-center justify-center gap-2 h-14 px-8 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 whitespace-nowrap"
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
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
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
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold text-slate-900 bg-amber-400 rounded-xl hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 transition-all duration-300 shadow-xl hover:shadow-amber-400/20 hover:scale-105"
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
                <Shield className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-medium text-white">Secure Escrow</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Zap className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-medium text-white">Instant Matching</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-medium text-white">AI Assessment</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Hero. SSR-safe: same placeholder until mounted to avoid hydration mismatch. */}
          <motion.div
            variants={!prefersReducedMotion ? itemVariants : undefined}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            {mounted ? (
              <HeroCard
                activeContractors={activeContractors}
                hasRealStats={hasRealStats}
                variant="contractor-hero"  // ← Contractor with mint fresh smile + thumbs up
              />
            ) : (
              <div
                className="relative w-full h-[600px] min-h-[520px] rounded-2xl bg-slate-900/40 border border-white/10 flex items-center justify-center overflow-hidden"
                aria-hidden="true"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-transparent to-slate-900/30 rounded-2xl" />
                <div className="w-28 h-28 rounded-full bg-slate-800/60 animate-pulse" />
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
