"use client";

import React, { useEffect, useState, useRef } from 'react';
import { logger } from '@mintenance/shared';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { HeroSection } from './components/landing/HeroSection';
import { Footer2025 } from './components/landing/Footer2025';
import { AccordionItem } from '@/components/ui/AccordionItem';

/**
 * MINTENANCE LANDING PAGE - PRODUCTION QUALITY
 * Inspired by Birch & Revealbot's Professional Design
 *
 * Colors: Navy Blue (#1E293B) + Mint Green (#14B8A6) + Amber Gold (#F59E0B)
 */

// Animated counter hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    // Cleanup: cancel animation frame on unmount
    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, duration]);

  return count;
}

/**
 * Animated Stat Counter Component with scroll trigger
 */
function AnimatedStat({ end, label, prefix = '', suffix = '', subtext, icon }: {
  end: number;
  label: string;
  prefix?: string;
  suffix?: string;
  subtext?: string;
  icon?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hasAnimated, setHasAnimated] = useState(false);
  const count = useCountUp(hasAnimated ? end : 0, 2000);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
    >
      <p className="text-sm font-semibold text-gray-600 mb-2">{label}</p>
      <p className="text-5xl font-bold text-gray-900 mb-2">
        {prefix}{count.toLocaleString()}{suffix}
      </p>
      {subtext && (
        <div className="flex items-center text-sm text-teal-600 font-medium">
          {icon || (
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          <span>{subtext}</span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * AI Preview Demo Component - Interactive damage detection animation
 */
function AIPreviewDemo() {
  const [stage, setStage] = useState<'idle' | 'detecting' | 'complete'>('idle');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      // Start detection animation sequence
      const timer1 = setTimeout(() => setStage('detecting'), 500);
      const timer2 = setTimeout(() => setStage('complete'), 2500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isInView]);

  const detections = [
    { x: 20, y: 15, w: 25, h: 20, label: 'Roof Damage', confidence: 97 },
    { x: 60, y: 30, w: 30, h: 25, label: 'Cracked Wall', confidence: 95 },
    { x: 15, y: 65, w: 20, h: 15, label: 'Window Seal', confidence: 92 },
  ];

  return (
    <div ref={ref} className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden">
      {/* Sample property image placeholder */}
      <div className="absolute inset-0 flex items-center justify-center text-slate-400">
        <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>

      {/* Scanning overlay */}
      {stage === 'detecting' && (
        <motion.div
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 2, ease: 'linear' }}
          className="absolute left-0 right-0 h-1 bg-teal-500 shadow-lg shadow-teal-500/50"
        />
      )}

      {/* Bounding boxes */}
      {stage === 'complete' && detections.map((detection, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.2, duration: 0.3 }}
          className="absolute border-2 border-teal-500"
          style={{
            left: `${detection.x}%`,
            top: `${detection.y}%`,
            width: `${detection.w}%`,
            height: `${detection.h}%`,
          }}
        >
          <div className="absolute -top-8 left-0 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {detection.label} ({detection.confidence}%)
          </div>
        </motion.div>
      ))}

      {/* Status indicator */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
          {stage === 'idle' && <span className="text-slate-600">Ready to analyze</span>}
          {stage === 'detecting' && (
            <span className="flex items-center gap-2 text-teal-600">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="inline-block"
              >
                ⚡
              </motion.span>
              Detecting...
            </span>
          )}
          {stage === 'complete' && (
            <span className="text-teal-600">
              ✓ 71 damage types found
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bento Grid Features Section Component
 */
function BentoFeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section ref={ref} className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Powered by{' '}
            <span className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
              Mint AI
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Revolutionary property maintenance platform with cutting-edge AI capabilities
          </p>
        </motion.div>

        {/* Bento Grid Layout */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-6 gap-6"
        >
          {/* Large Feature - AI Building Surveyor (2x2 grid space) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 md:row-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-3xl opacity-100 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-transparent rounded-3xl" />

            {/* Animated gradient border on hover */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear',
                }}
              />
            </div>

            <div className="relative h-full p-10 flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-bold mb-6 shadow-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  NEW - Mint AI
                </div>

                <h3 className="text-4xl font-bold text-white mb-4">
                  AI Building Surveyor
                </h3>
                <p className="text-xl text-white/90 mb-6 leading-relaxed max-w-xl">
                  Upload property photos and receive instant damage assessment with cost estimates.
                  Mint AI detects 71 damage types automatically with 95%+ accuracy.
                </p>

                <div className="flex flex-wrap gap-3 mb-8">
                  <div className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white text-base font-bold">
                    ⚡ Mint AI Technology
                  </div>
                </div>
              </div>

              {/* AI Preview Demo */}
              <div className="mt-6">
                <AIPreviewDemo />
              </div>

              <Link
                href="/try-mint-ai"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-700 rounded-xl font-bold hover:bg-white/90 transition-all group/link mt-6 w-fit focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
              >
                Try AI Assessment
                <svg className="w-5 h-5 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </motion.div>

          {/* Medium Feature - Swipe to Hire */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-pink-100 rounded-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.1),transparent)] rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[240px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Swipe to Hire</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Tinder-style matching for contractors. Swipe right to connect.
                </p>
              </div>
              <Link href="/discover" className="inline-flex items-center text-pink-600 font-semibold hover:text-pink-700 group/link">
                Start swiping
                <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </motion.div>

          {/* Medium Feature - Zero-Risk Escrow */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.1),transparent)] rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[240px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Zero-Risk Escrow</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Payment protection until job completion. 100% satisfaction guaranteed.
                </p>
              </div>
              <Link href="/payments" className="inline-flex items-center text-amber-600 font-semibold hover:text-amber-700 group/link">
                Learn more
                <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </motion.div>

          {/* Small Feature - Verified Professionals */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[200px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Verified Pros</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Background-checked contractors
                </p>
              </div>
            </div>
          </motion.div>

          {/* Small Feature - Real-Time Messaging */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[200px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Live Chat</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Instant communication
                </p>
              </div>
            </div>
          </motion.div>

          {/* Small Feature - Project Tracking */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[200px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Progress Tracking</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Real-time project updates
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

interface PlatformStats {
  activeContractors: number;
  activeContractorsGrowth: number;
  completedJobs: number;
  completedJobsGrowth: number;
  totalSaved: number;
  totalSavedGrowth: number;
  avgResponseTimeHours: number;
  responseTimeImprovement: number;
}

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [hasRealStats, setHasRealStats] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);

  // Fetch platform statistics from API (real contractor/user data only)
  useEffect(() => {
    setIsMounted(true);

    async function fetchStats() {
      try {
        const response = await fetch('/api/stats/platform');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          setHasRealStats(true);
        } else {
          setStats({
            activeContractors: 2847,
            activeContractorsGrowth: 12,
            completedJobs: 12456,
            completedJobsGrowth: 23,
            totalSaved: 1250000,
            totalSavedGrowth: 18,
            avgResponseTimeHours: 2.4,
            responseTimeImprovement: 15,
          });
          setHasRealStats(false);
        }
      } catch (error) {
        logger.error('Failed to fetch platform statistics:', error);
        // Use fallback values on error
        setStats({
          activeContractors: 2847,
          activeContractorsGrowth: 12,
          completedJobs: 12456,
          completedJobsGrowth: 23,
          totalSaved: 1250000,
          totalSavedGrowth: 18,
          avgResponseTimeHours: 2.4,
          responseTimeImprovement: 15,
        });
        setHasRealStats(false);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Stats are now handled by AnimatedStat component with scroll trigger
  // No need for top-level hooks

  // Smooth scroll for hash links (only for same-page navigation)
  useEffect(() => {
    const handleHashClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#"]') as HTMLAnchorElement;
      if (link && link.getAttribute('href')?.startsWith('#')) {
        const hash = link.getAttribute('href');
        if (hash && hash !== '#' && window.location.pathname === '/') {
          e.preventDefault();
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update URL without triggering scroll
            window.history.pushState(null, '', hash);
          }
        }
      }
    };

    document.addEventListener('click', handleHashClick);
    return () => document.removeEventListener('click', handleHashClick);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Sticky CTA on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 800);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Exit intent detection
  useEffect(() => {
    let hasShown = false;
    const handleMouseLeave = (e: MouseEvent) => {
      if (!hasShown && e.clientY <= 10 && window.scrollY > 500) {
        setShowExitIntent(true);
        hasShown = true;
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-slate-900">
              Mintenance
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#how-it-works" className="text-gray-700 hover:text-slate-900 font-medium transition-colors">
                How It Works
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-slate-900 font-medium transition-colors">
                For Homeowners
              </Link>
              <Link href="/contractor/dashboard-enhanced" className="text-gray-700 hover:text-slate-900 font-medium transition-colors">
                For Contractors
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-slate-900 font-medium transition-colors">
                About
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }
              }}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
              <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg md:hidden z-50">
                <nav className="px-4 py-4 space-y-3">
                  <Link
                    href="#how-it-works"
                    className="block px-4 py-2 text-gray-700 hover:text-slate-900 hover:bg-gray-50 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    How It Works
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-gray-700 hover:text-slate-900 hover:bg-gray-50 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    For Homeowners
                  </Link>
                  <Link
                    href="/contractor/dashboard-enhanced"
                    className="block px-4 py-2 text-gray-700 hover:text-slate-900 hover:bg-gray-50 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    For Contractors
                  </Link>
                  <Link
                    href="/about"
                    className="block px-4 py-2 text-gray-700 hover:text-slate-900 hover:bg-gray-50 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link
                    href="/login"
                    className="block px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors text-center mt-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </nav>
              </div>
            )}

            <Link
              href="/login"
              className="hidden md:inline-flex px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-semibold transition-all hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-50 -translate-y-full px-4 py-2 bg-slate-900 text-white rounded-lg outline-none ring-2 ring-slate-500 focus:translate-y-0 focus:outline-none transition-transform"
      >
        Skip to main content
      </a>

      {/* MAIN CONTENT */}
      <main id="main-content" className="pt-16">

        {/* HERO SECTION - Uses real contractor count only when API data available */}
        <HeroSection
          activeContractors={stats?.activeContractors ?? null}
          hasRealStats={hasRealStats}
          statsLoading={loading}
        />

        {/* STATS SECTION */}
        <section className="py-24 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-900 mb-4">Trusted by thousands</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join the growing community of homeowners and contractors who trust Mintenance
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold mt-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M13 7H7v6h6V7z" />
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                </svg>
                Powered by Mint AI
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Stat 1 - AI Damage Types */}
              <AnimatedStat
                end={71}
                label="Damage Types Detected by AI"
                subtext="Multi-model fusion"
              />

              {/* Stat 2 - AI Accuracy */}
              <AnimatedStat
                end={95}
                label="AI Accuracy Rate"
                suffix="%+"
                subtext="Continuously improving"
              />

              {/* Stat 3 - Active Contractors */}
              <AnimatedStat
                end={stats?.activeContractors || 2847}
                label="Active Contractors"
                suffix="+"
                subtext={`+${stats?.activeContractorsGrowth || 12}% this month`}
              />

              {/* Stat 4 - Jobs Completed */}
              <AnimatedStat
                end={stats?.completedJobs || 12456}
                label="Jobs Completed"
                suffix="+"
                subtext={`+${stats?.completedJobsGrowth || 23}% this month`}
              />
            </div>
          </div>
        </section>

        {/* FEATURES BENTO GRID SECTION */}
        <BentoFeaturesSection />

        {/* COMPARISON SECTION */}
        <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-900 mb-4">Why Mintenance Beats Traditional Methods</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                See how AI-powered automation saves you time and money
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                    <th className="px-6 py-4 text-left text-lg font-bold">Feature</th>
                    <th className="px-6 py-4 text-left text-lg font-bold">Traditional Method</th>
                    <th className="px-6 py-4 text-left text-lg font-bold bg-teal-600">
                      <div className="flex items-center gap-2">
                        Mintenance
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 font-semibold text-gray-900">Damage Assessment</td>
                    <td className="px-6 py-5 text-gray-600">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>Wait 3-5 days for quotes</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 bg-teal-50">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <strong className="text-teal-900">Instant AI analysis</strong>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 font-semibold text-gray-900">Cost Estimate</td>
                    <td className="px-6 py-5 text-gray-600">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>Unknown until bids arrive</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 bg-teal-50">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <strong className="text-teal-900">AI estimate in 60 seconds</strong>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 font-semibold text-gray-900">Contractor Matching</td>
                    <td className="px-6 py-5 text-gray-600">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>Manual search, cold calling</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 bg-teal-50">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <strong className="text-teal-900">Swipe right to hire</strong>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 font-semibold text-gray-900">Payment Protection</td>
                    <td className="px-6 py-5 text-gray-600">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>Upfront payment (risky)</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 bg-teal-50">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <strong className="text-teal-900">Escrow until completion</strong>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-center mt-12">
              <Link
                href="/register"
                className="inline-flex px-10 py-5 bg-teal-600 text-white text-lg font-bold rounded-2xl hover:bg-teal-700 hover:shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                Experience the Difference
              </Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold text-gray-900 mb-4">How it works</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Get your home project done in three simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Step 1 */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-4xl font-bold mb-6 shadow-lg">
                  1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Post Your Job</h3>
                <p className="text-gray-600 leading-relaxed">
                  Describe your project in detail, upload photos, and set your budget. It takes less than 5 minutes.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 text-white text-4xl font-bold mb-6 shadow-lg">
                  2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Compare Bids</h3>
                <p className="text-gray-600 leading-relaxed">
                  Receive competitive quotes from verified contractors. Review profiles, ratings, and portfolios.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white text-4xl font-bold mb-6 shadow-lg">
                  3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Hire & Complete</h3>
                <p className="text-gray-600 leading-relaxed">
                  Choose the best contractor, track progress, and release payment once you're satisfied with the work.
                </p>
              </div>
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

        {/* TESTIMONIALS - Enhanced with verified badges and animations */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-5xl font-bold text-gray-900 mb-4">What our customers say</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Real stories from homeowners who found the perfect contractor
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
              >
                {/* Animated quote marks */}
                <div className="absolute top-4 right-4 text-teal-100 text-6xl font-serif opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden="true">"</div>

                <div className="flex gap-1 mb-6" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, i) => (
                    <motion.svg
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
                      className="w-5 h-5 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </motion.svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic relative z-10">
                  "I posted my kitchen renovation and had 5 quotes within 24 hours. The contractor I chose was professional, affordable, and did an amazing job. Highly recommended!"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    SM
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">Sarah Mitchell</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold" title="Verified Customer">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Homeowner, London</p>
                  </div>
                </div>
              </motion.div>

              {/* Testimonial 2 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
              >
                {/* Animated quote marks */}
                <div className="absolute top-4 right-4 text-teal-100 text-6xl font-serif opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden="true">"</div>

                <div className="flex gap-1 mb-6" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, i) => (
                    <motion.svg
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
                      className="w-5 h-5 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </motion.svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic relative z-10">
                  "As a contractor, Mintenance has transformed my business. I get quality leads, fair pricing, and the platform handles all the admin. Game-changer!"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    JO
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">James O'Connor</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold" title="Verified Contractor">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified Pro
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Electrician, Manchester</p>
                  </div>
                </div>
              </motion.div>

              {/* Testimonial 3 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
              >
                {/* Animated quote marks */}
                <div className="absolute top-4 right-4 text-teal-100 text-6xl font-serif opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden="true">"</div>

                <div className="flex gap-1 mb-6" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, i) => (
                    <motion.svg
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
                      className="w-5 h-5 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </motion.svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic relative z-10">
                  "The escrow payment system gave me peace of mind. I knew my money was safe until the work was completed to my satisfaction. Brilliant platform!"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    ER
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">Emily Roberts</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold" title="Verified Customer">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Homeowner, Birmingham</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* TRUST INDICATORS - Security & Partner Badges */}
        <section className="py-16 bg-gray-50 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Trusted & Secure</h3>
              <p className="text-gray-600">Your data and payments are protected by industry-leading security</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
              {/* SSL Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 w-full hover:shadow-md transition-shadow"
              >
                <svg className="w-12 h-12 text-teal-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h4 className="font-bold text-gray-900 text-sm mb-1">256-bit SSL</h4>
                <p className="text-xs text-gray-600">Encrypted</p>
              </motion.div>

              {/* Payment Protection */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 w-full hover:shadow-md transition-shadow"
              >
                <svg className="w-12 h-12 text-green-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Payment</h4>
                <p className="text-xs text-gray-600">Protected</p>
              </motion.div>

              {/* GDPR Compliant */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 w-full hover:shadow-md transition-shadow"
              >
                <svg className="w-12 h-12 text-blue-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="font-bold text-gray-900 text-sm mb-1">GDPR</h4>
                <p className="text-xs text-gray-600">Compliant</p>
              </motion.div>

              {/* Verified Contractors */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 w-full hover:shadow-md transition-shadow"
              >
                <svg className="w-12 h-12 text-amber-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="font-bold text-gray-900 text-sm mb-1">All Contractors</h4>
                <p className="text-xs text-gray-600">Verified</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-5xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Get answers to common questions about using Mintenance
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <AccordionItem
                title="How does the AI damage detection work?"
                content={
                  <p className="text-gray-700 leading-relaxed">
                    Our Mint AI uses advanced computer vision to analyse property photos and detect 71 different types of damage.
                    Simply upload images, and within 60 seconds, you'll receive a detailed assessment with estimated repair costs.
                    The AI has been trained on thousands of property images and maintains a 95%+ accuracy rate.
                  </p>
                }
                className="border-b border-gray-200"
                titleClassName="px-6 text-lg"
                contentClassName="px-6"
              />
              <AccordionItem
                title="How does the escrow payment system work?"
                content={
                  <p className="text-gray-700 leading-relaxed">
                    When you accept a contractor's bid, your payment is held securely in escrow by Mintenance. The contractor
                    completes the work, you approve it, and then funds are released. If there's any issue, our mediation team
                    steps in to resolve it fairly. This protects both homeowners and contractors.
                  </p>
                }
                className="border-b border-gray-200"
                titleClassName="px-6 text-lg"
                contentClassName="px-6"
              />
              <AccordionItem
                title="Are all contractors verified and insured?"
                content={
                  <p className="text-gray-700 leading-relaxed">
                    Yes, absolutely. We verify all contractor certifications (Gas Safe, NICEIC, etc.), check insurance coverage
                    (minimum £5M public liability, £2M professional indemnity), run background checks, and verify business
                    registration. Only fully verified contractors can bid on jobs.
                  </p>
                }
                className="border-b border-gray-200"
                titleClassName="px-6 text-lg"
                contentClassName="px-6"
              />
              <AccordionItem
                title="What fees does Mintenance charge?"
                content={
                  <p className="text-gray-700 leading-relaxed">
                    Homeowners can post jobs completely free. Contractors pay a small service fee (typically 5-10%) only when
                    they win a job. There are no monthly subscriptions, listing fees, or hidden costs. The exact fee is clearly
                    shown before accepting any job.
                  </p>
                }
                className="border-b border-gray-200"
                titleClassName="px-6 text-lg"
                contentClassName="px-6"
              />
              <AccordionItem
                title="How long does it take to get quotes?"
                content={
                  <p className="text-gray-700 leading-relaxed">
                    Most jobs receive 3-8 competitive bids within 24-48 hours. Our AI instantly matches your job with qualified
                    contractors in your area. You can review profiles, ratings, portfolios, and compare quotes before choosing
                    the best contractor for your project.
                  </p>
                }
                className="border-b border-gray-200"
                titleClassName="px-6 text-lg"
                contentClassName="px-6"
              />
              <AccordionItem
                title="What if I'm not satisfied with the work?"
                content={
                  <p className="text-gray-700 leading-relaxed">
                    We offer free dispute resolution services. Contact our support team with details and evidence (photos,
                    messages, contracts). Our mediation team will review the case within 5-7 business days and help reach a
                    fair resolution. Your payment stays in escrow until the issue is resolved.
                  </p>
                }
                titleClassName="px-6 text-lg"
                contentClassName="px-6"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center mt-12"
            >
              <p className="text-gray-600 mb-4">Still have questions?</p>
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 px-6 py-3 text-teal-600 hover:text-teal-700 font-semibold transition-colors"
              >
                View All FAQs
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* FOR CONTRACTORS CTA */}
        <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-5xl font-bold text-white mb-6">Are you a contractor?</h2>
                <p className="text-xl text-white/80 mb-10 leading-relaxed">
                  Join thousands of professionals growing their business with Mintenance. Get quality leads, manage projects efficiently, and get paid faster.
                </p>

                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-4">
                    <svg className="w-6 h-6 text-teal-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Quality Leads</h4>
                      <p className="text-white/70 leading-relaxed">Get matched with serious homeowners ready to hire</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <svg className="w-6 h-6 text-teal-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Grow Your Business</h4>
                      <p className="text-white/70 leading-relaxed">Build your reputation with reviews and referrals</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <svg className="w-6 h-6 text-teal-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Get Paid Faster</h4>
                      <p className="text-white/70 leading-relaxed">Secure payments released within 24 hours of completion</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/contractor/dashboard-enhanced"
                  className="inline-flex px-10 py-5 bg-amber-500 text-white text-lg font-bold rounded-2xl hover:bg-amber-600 hover:shadow-2xl transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                  Join as a Contractor
                </Link>
              </div>

              <div className="grid gap-6">
                {/* Stat card 1 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <p className="text-white/70 text-sm font-medium mb-2">Average Monthly Earnings</p>
                  <p className="text-5xl font-bold text-white mb-2">£4,250</p>
                  <div className="flex items-center text-sm text-teal-400 font-medium">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L9 11.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0L11 10.586 14.586 7H13a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>+23%</span>
                  </div>
                </div>

                {/* Stat card 2 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <p className="text-white/70 text-sm font-medium mb-2">Jobs per Month</p>
                  <p className="text-5xl font-bold text-white mb-2">12</p>
                  <div className="flex items-center text-sm text-teal-400 font-medium">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L9 11.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0L11 10.586 14.586 7H13a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>+15%</span>
                  </div>
                </div>

                {/* Stat card 3 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <p className="text-white/70 text-sm font-medium mb-2">Customer Satisfaction</p>
                  <p className="text-5xl font-bold text-white mb-2">98%</p>
                  <div className="flex items-center text-sm text-teal-400 font-medium">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L9 11.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0L11 10.586 14.586 7H13a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>+5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Ready to get started?</h2>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Join thousands of homeowners and contractors who trust Mintenance for their home maintenance projects.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                href="/jobs/create"
                className="px-10 py-5 bg-slate-900 text-white text-lg font-bold rounded-2xl hover:bg-slate-800 hover:shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Post Your First Job
              </Link>
              <Link
                href="/contractors"
                className="px-10 py-5 bg-gray-100 text-gray-900 text-lg font-bold rounded-2xl hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Browse Contractors
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <Footer2025 />

      {/* STICKY FLOATING CTA BUTTON */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Link
              href="/jobs/create"
              className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold rounded-full shadow-2xl hover:shadow-teal-500/50 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              aria-label="Post a job now"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Post a Job</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXIT-INTENT MODAL */}
      <AnimatePresence>
        {showExitIntent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowExitIntent(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowExitIntent(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-lg p-2"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full mb-6 shadow-lg"
                >
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </motion.div>

                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Wait! Before You Go...
                </h2>
                <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
                  Get your first AI damage assessment <strong className="text-teal-600">FREE</strong>.
                  See what our Mint AI can do for your property in just 60 seconds.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/try-mint-ai"
                    className="px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white text-lg font-bold rounded-xl hover:shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    onClick={() => setShowExitIntent(false)}
                  >
                    Try AI Assessment Free
                  </Link>
                  <button
                    onClick={() => setShowExitIntent(false)}
                    className="px-8 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                  >
                    No Thanks
                  </button>
                </div>

                <p className="text-sm text-gray-500 mt-6">
                  ✓ No credit card required &nbsp;&nbsp; ✓ Instant results &nbsp;&nbsp; ✓ 100% free
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
