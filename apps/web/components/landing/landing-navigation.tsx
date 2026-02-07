'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '/dashboard', label: 'For Homeowners' },
  { href: '/contractor/dashboard-enhanced', label: 'For Contractors' },
  { href: '/about', label: 'About' },
];

/**
 * Landing page top navigation bar.
 * Self-contained: manages its own mobile menu state and escape-key handler.
 */
export function LandingNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-slate-900">
            Mintenance
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-slate-900 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
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
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 text-gray-700 hover:text-slate-900 hover:bg-gray-50 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
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
  );
}
