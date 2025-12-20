/**
 * Design System Showcase
 * Visual demonstration of Mintenance's professional design system
 * Inspired by Birch & Revealbot
 */

import React from 'react';

export const DesignSystemShowcase = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Birch-inspired */}
      <section className="gradient-mesh section-padding-lg">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h1 className="text-display-lg font-bold text-navy-900 mb-6 animate-fade-in">
            Professional Design System
          </h1>
          <p className="text-body-lg text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in stagger-1">
            Sleek, modern, and professional. Inspired by industry leaders like Birch and Revealbot.
          </p>
          <div className="flex gap-4 justify-center animate-fade-in stagger-2">
            <button className="btn btn-primary btn-lg">
              Get Started
            </button>
            <button className="btn btn-ghost btn-lg">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Color Palette */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-h2 font-semibold text-navy-800 mb-8">
            Brand Colors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Navy */}
            <div className="space-y-4">
              <h3 className="text-h4 font-semibold text-gray-900 mb-4">
                Primary: Navy Blue
              </h3>
              <div className="space-y-2">
                <div className="h-16 bg-navy-800 rounded-lg flex items-center justify-center text-white font-semibold">
                  #1E293B
                </div>
                <p className="text-body-sm text-gray-600">
                  Professional, trustworthy, stable
                </p>
              </div>
            </div>

            {/* Mint */}
            <div className="space-y-4">
              <h3 className="text-h4 font-semibold text-gray-900 mb-4">
                Secondary: Mint Green
              </h3>
              <div className="space-y-2">
                <div className="h-16 bg-mint-500 rounded-lg flex items-center justify-center text-white font-semibold">
                  #14B8A6
                </div>
                <p className="text-body-sm text-gray-600">
                  Fresh, modern, reliable
                </p>
              </div>
            </div>

            {/* Gold */}
            <div className="space-y-4">
              <h3 className="text-h4 font-semibold text-gray-900 mb-4">
                Accent: Yellow/Gold
              </h3>
              <div className="space-y-2">
                <div className="h-16 bg-gold-500 rounded-lg flex items-center justify-center text-white font-semibold">
                  #F59E0B
                </div>
                <p className="text-body-sm text-gray-600">
                  Energy, optimism, attention
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-h2 font-semibold text-navy-800 mb-8">
            Buttons
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <h4 className="text-caption text-gray-500">PRIMARY</h4>
              <button className="btn btn-primary w-full">
                Primary Button
              </button>
            </div>
            <div className="space-y-4">
              <h4 className="text-caption text-gray-500">SECONDARY</h4>
              <button className="btn btn-secondary w-full">
                Secondary Button
              </button>
            </div>
            <div className="space-y-4">
              <h4 className="text-caption text-gray-500">GOLD CTA</h4>
              <button className="btn btn-gold w-full">
                Gold Accent
              </button>
            </div>
            <div className="space-y-4">
              <h4 className="text-caption text-gray-500">GHOST</h4>
              <button className="btn btn-ghost w-full">
                Ghost Button
              </button>
            </div>
          </div>

          {/* Button Sizes */}
          <div className="mt-12 space-y-4">
            <h4 className="text-h4 font-semibold text-gray-900">
              Button Sizes
            </h4>
            <div className="flex flex-wrap gap-4 items-center">
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-primary">Default</button>
              <button className="btn btn-primary btn-lg">Large</button>
              <button className="btn btn-primary btn-xl">Extra Large</button>
            </div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-h2 font-semibold text-navy-800 mb-8">
            Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Standard Card */}
            <div className="card hover-lift">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-mint-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-mint-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="badge badge-success">Verified</span>
              </div>
              <h3 className="text-h4 font-semibold text-gray-900 mb-2">
                Standard Card
              </h3>
              <p className="text-body text-gray-600 mb-4">
                Clean white background with subtle border and shadow. Lifts on hover.
              </p>
              <button className="btn btn-secondary btn-sm w-full">
                View Details
              </button>
            </div>

            {/* Elevated Card */}
            <div className="card-elevated hover-lift">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="badge badge-warning">Featured</span>
              </div>
              <h3 className="text-h4 font-semibold text-gray-900 mb-2">
                Elevated Card
              </h3>
              <p className="text-body text-gray-600 mb-4">
                No border with enhanced shadow for floating effect. Perfect for emphasis.
              </p>
              <button className="btn btn-gold btn-sm w-full">
                Learn More
              </button>
            </div>

            {/* Glass Card */}
            <div className="glass-mint p-8 rounded-xl hover-lift">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-mint-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="badge badge-info">Premium</span>
              </div>
              <h3 className="text-h4 font-semibold text-navy-900 mb-2">
                Glass Card
              </h3>
              <p className="text-body text-navy-800 mb-4">
                Frosted glass effect with backdrop blur. Modern and eye-catching.
              </p>
              <button className="btn btn-primary btn-sm w-full">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-h2 font-semibold text-navy-800 mb-8">
            Typography Scale
          </h2>
          <div className="space-y-6 card max-w-4xl">
            <div>
              <p className="text-caption text-gray-500 mb-2">DISPLAY LARGE (72px)</p>
              <h1 className="text-display-lg font-bold text-navy-900">
                Hero Headlines
              </h1>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-2">H1 (40px)</p>
              <h1 className="text-h1 font-bold text-navy-900">
                Page Titles
              </h1>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-2">H2 (32px)</p>
              <h2 className="text-h2 font-semibold text-navy-800">
                Section Headings
              </h2>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-2">H3 (24px)</p>
              <h3 className="text-h3 font-semibold text-gray-900">
                Subsection Headings
              </h3>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-2">BODY (16px)</p>
              <p className="text-body text-gray-600">
                This is the default body text size. It's optimized for readability with a line height of 1.6.
                All text meets WCAG AA accessibility standards.
              </p>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-2">CAPTION (12px)</p>
              <p className="text-caption text-gray-500">
                SUPPORTING TEXT, LABELS, AND BADGES
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Elements */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-h2 font-semibold text-navy-800 mb-8">
            Form Elements
          </h2>
          <div className="card space-y-6">
            <div>
              <label className="block text-body-sm font-medium text-gray-700 mb-2">
                Default Input
              </label>
              <input
                type="text"
                placeholder="Enter your text"
                className="input"
              />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-gray-700 mb-2">
                Error State
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                className="input input-error"
              />
              <p className="text-body-sm text-error-600 mt-1">
                Please enter a valid email address
              </p>
            </div>
            <div>
              <label className="block text-body-sm font-medium text-gray-700 mb-2">
                Disabled Input
              </label>
              <input
                type="text"
                placeholder="Disabled field"
                className="input"
                disabled
              />
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-h2 font-semibold text-navy-800 mb-8">
            Status Badges
          </h2>
          <div className="card">
            <div className="flex flex-wrap gap-3">
              <span className="badge badge-success">Success</span>
              <span className="badge badge-warning">Warning</span>
              <span className="badge badge-error">Error</span>
              <span className="badge badge-info">Info</span>
              <span className="badge badge-neutral">Neutral</span>
            </div>
          </div>
        </div>
      </section>

      {/* Shadows */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-h2 font-semibold text-navy-800 mb-8">
            Shadow System
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-caption text-gray-500 mb-4">SUBTLE</p>
              <div className="h-32 bg-white shadow-subtle rounded-lg flex items-center justify-center">
                <span className="text-body-sm text-gray-600">shadow-subtle</span>
              </div>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-4">BASE</p>
              <div className="h-32 bg-white shadow-base rounded-lg flex items-center justify-center">
                <span className="text-body-sm text-gray-600">shadow-base</span>
              </div>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-4">MEDIUM</p>
              <div className="h-32 bg-white shadow-md rounded-lg flex items-center justify-center">
                <span className="text-body-sm text-gray-600">shadow-md</span>
              </div>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-4">LARGE</p>
              <div className="h-32 bg-white shadow-lg rounded-lg flex items-center justify-center">
                <span className="text-body-sm text-gray-600">shadow-lg</span>
              </div>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-4">PRIMARY GLOW</p>
              <div className="h-32 bg-white shadow-primary rounded-lg flex items-center justify-center">
                <span className="text-body-sm text-gray-600">shadow-primary</span>
              </div>
            </div>
            <div>
              <p className="text-caption text-gray-500 mb-4">SECONDARY GLOW</p>
              <div className="h-32 bg-white shadow-secondary rounded-lg flex items-center justify-center">
                <span className="text-body-sm text-gray-600">shadow-secondary</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-padding bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-h3 font-semibold text-white mb-4">
            Mintenance Design System
          </h3>
          <p className="text-body text-gray-300 mb-6">
            Professional, modern, and accessible. Inspired by Birch & Revealbot.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="btn btn-secondary">
              View Documentation
            </button>
            <button className="btn btn-ghost" style={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
              GitHub
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DesignSystemShowcase;
