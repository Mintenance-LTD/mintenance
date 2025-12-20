"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer2025 } from './components/landing/Footer2025';

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

  // Fetch platform statistics from API
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats/platform');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Use fallback values if API fails
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
        }
      } catch (error) {
        console.error('Failed to fetch platform statistics:', error);
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
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Use animated counters with real data or fallback
  // Always call hooks (Rules of Hooks), but ensure consistent initial render
  const contractors = useCountUp(stats?.activeContractors || 2847);
  const jobs = useCountUp(stats?.completedJobs || 12456);
  const saved = useCountUp(stats?.totalSaved || 1250000);
  const responseTime = stats?.avgResponseTimeHours || 2.4;

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

        {/* HERO SECTION - Navy to Teal Gradient */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 min-h-[90vh] flex items-center">
          {/* Decorative gradient overlays */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(20,184,166,0.4),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_60%)]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white/90 mb-8 border border-white/20">
              <span className="text-xl">🏠</span>
              <span>Trusted Home Maintenance Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-8 leading-tight max-w-5xl mx-auto">
              Connect with vetted contractors in{' '}
              <span className="bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-transparent">
                minutes, not days
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl md:text-2xl text-white/80 mb-14 max-w-3xl mx-auto leading-relaxed">
              Post your job, receive competitive bids, and hire trusted professionals with confidence. From plumbing to electrical, we've got you covered.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20">
              <Link
                href="/jobs/create"
                className="group px-10 py-5 bg-amber-500 text-white text-lg font-bold rounded-2xl hover:bg-amber-600 hover:shadow-2xl transition-all transform hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Post a Job for Free
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </Link>
              <Link
                href="/contractors"
                className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white text-lg font-bold rounded-2xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Browse Contractors
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-10 text-white/70 text-sm font-medium">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>4.8/5 average rating</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>100% verified contractors</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure payments</span>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="py-24 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-gray-900 mb-4">Trusted by thousands</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join the growing community of homeowners and contractors who trust Mintenance
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Stat 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <p className="text-sm font-semibold text-gray-600 mb-2">Active Contractors</p>
                {loading || !isMounted ? (
                  <p className="text-5xl font-bold text-gray-900 mb-2">...</p>
                ) : (
                  <p className="text-5xl font-bold text-gray-900 mb-2">
                    {contractors.toLocaleString()}+
                  </p>
                )}
                <div className="flex items-center text-sm text-green-600 font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L9 11.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0L11 10.586 14.586 7H13a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>+{stats?.activeContractorsGrowth || 12}% this month</span>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <p className="text-sm font-semibold text-gray-600 mb-2">Jobs Completed</p>
                {loading ? (
                  <p className="text-5xl font-bold text-gray-900 mb-2">...</p>
                ) : (
                  <p className="text-5xl font-bold text-gray-900 mb-2">{jobs.toLocaleString()}+</p>
                )}
                <div className="flex items-center text-sm text-green-600 font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L9 11.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0L11 10.586 14.586 7H13a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>+{stats?.completedJobsGrowth || 23}% this month</span>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <p className="text-sm font-semibold text-gray-600 mb-2">Total Saved</p>
                {loading || !isMounted ? (
                  <p className="text-5xl font-bold text-gray-900 mb-2">...</p>
                ) : (
                  <p className="text-5xl font-bold text-gray-900 mb-2">
                    £{(saved / 1000).toLocaleString()}k
                  </p>
                )}
                <div className="flex items-center text-sm text-green-600 font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L9 11.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0L11 10.586 14.586 7H13a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>+{stats?.totalSavedGrowth || 18}% this month</span>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <p className="text-sm font-semibold text-gray-600 mb-2">Avg. Response Time</p>
                {loading || !isMounted ? (
                  <p className="text-5xl font-bold text-gray-900 mb-2">...</p>
                ) : (
                  <p className="text-5xl font-bold text-gray-900 mb-2">{responseTime.toFixed(1)} hrs</p>
                )}
                <div className="flex items-center text-sm text-green-600 font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 13a1 1 0 001 1h4a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L9 8.586 5.707 5.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0L11 9.414 14.586 13H13a1 1 0 00-1 1z" clipRule="evenodd" />
                  </svg>
                  <span>{stats?.responseTimeImprovement || 15}% faster</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold text-gray-900 mb-4">Everything you need</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                A complete platform for managing home maintenance projects from start to finish
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {/* Feature 1 */}
              <div className="group bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all border border-gray-100">
                <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Post Jobs Instantly</h3>
                <p className="text-gray-600 mb-5 leading-relaxed">
                  Describe your project and get competitive bids from verified contractors within hours. No more endless phone calls or waiting.
                </p>
                <Link href="/jobs/create" className="inline-flex items-center text-teal-600 font-semibold hover:text-teal-700 group/link focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded">
                  Post a job
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Feature 2 */}
              <div className="group bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all border border-gray-100">
                <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Verified Professionals</h3>
                <p className="text-gray-600 mb-5 leading-relaxed">
                  Every contractor is background-checked, licensed, and insured. Read real reviews from verified customers before you hire.
                </p>
                <Link href="/contractors" className="inline-flex items-center text-teal-600 font-semibold hover:text-teal-700 group/link">
                  Browse contractors
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Feature 3 */}
              <div className="group bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all border border-gray-100">
                <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Secure Payments</h3>
                <p className="text-gray-600 mb-5 leading-relaxed">
                  Payments are held in escrow until work is complete. Both parties are protected with our secure payment system.
                </p>
                <Link href="/payments" className="inline-flex items-center text-teal-600 font-semibold hover:text-teal-700 group/link">
                  Learn about payments
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Feature 4 */}
              <div className="group bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all border border-gray-100">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Real-Time Messaging</h3>
                <p className="text-gray-600 mb-5 leading-relaxed">
                  Communicate directly with contractors through our platform. Share photos, documents, and project updates instantly.
                </p>
                <Link href="/messages" className="inline-flex items-center text-teal-600 font-semibold hover:text-teal-700 group/link">
                  View messages
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Feature 5 */}
              <div className="group bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all border border-gray-100">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Project Tracking</h3>
                <p className="text-gray-600 mb-5 leading-relaxed">
                  Track progress, manage schedules, and view project milestones all in one place. Stay informed every step of the way.
                </p>
                <Link href="/dashboard" className="inline-flex items-center text-teal-600 font-semibold hover:text-teal-700 group/link">
                  View dashboard
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Feature 6 */}
              <div className="group bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all border border-gray-100">
                <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Review System</h3>
                <p className="text-gray-600 mb-5 leading-relaxed">
                  Rate and review contractors after each job. Help the community make informed decisions with honest feedback.
                </p>
                <Link href="/contractors" className="inline-flex items-center text-teal-600 font-semibold hover:text-teal-700 group/link">
                  Read reviews
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-gradient-to-b from-gray-50 to-white">
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

        {/* TESTIMONIALS */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold text-gray-900 mb-4">What our customers say</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Real stories from homeowners who found the perfect contractor
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 mb-6" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "I posted my kitchen renovation and had 5 quotes within 24 hours. The contractor I chose was professional, affordable, and did an amazing job. Highly recommend!"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                    SM
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Sarah Mitchell</p>
                    <p className="text-sm text-gray-600">Homeowner, London</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 mb-6" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "As a contractor, Mintenance has transformed my business. I get quality leads, fair pricing, and the platform handles all the admin. Game changer!"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                    JO
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">James O'Connor</p>
                    <p className="text-sm text-gray-600">Electrician, Manchester</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 mb-6" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "The escrow payment system gave me peace of mind. I knew my money was safe until the work was completed to my satisfaction. Brilliant platform!"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                    ER
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Emily Roberts</p>
                    <p className="text-sm text-gray-600">Homeowner, Birmingham</p>
                  </div>
                </div>
              </div>
            </div>
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

    </div>
  );
}
