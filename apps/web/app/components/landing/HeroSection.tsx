'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DemoModal } from '../ui/DemoModal';

/**
 * Hero section for landing page
 * Main call-to-action with desktop mockup visual
 * Features rotating screenshots from actual app screens
 */
export function HeroSection() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Screenshots to rotate through - showing real app screens
  const screenshots = [
    {
      type: 'homeowner',
      title: 'Homeowner Dashboard',
      description: 'Track your jobs and manage your home projects',
      image: '/screenshots/homeowner-dashboard.png',
      alt: 'Homeowner dashboard showing job management',
    },
    {
      type: 'homeowner',
      title: 'Your Jobs',
      description: 'View and manage all your posted jobs',
      image: '/screenshots/homeowner-jobs.png',
      alt: 'Homeowner jobs page showing active projects',
    },
    {
      type: 'contractor',
      title: 'Contractor Dashboard',
      description: 'Manage your business and track performance',
      image: '/screenshots/contractor-dashboard-enhanced.png',
      alt: 'Contractor dashboard with analytics and metrics',
    },
    {
      type: 'contractor',
      title: 'Jobs & Bids',
      description: 'Browse available jobs and submit bids',
      image: '/screenshots/contractor-jobs.png',
      alt: 'Contractor jobs page showing available opportunities',
    },
  ];

  // Auto-rotate screenshots every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % screenshots.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [screenshots.length]);

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary to-primary-light relative overflow-hidden" role="banner">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Find Trusted Tradespeople
              <br />
              <span className="text-secondary">For Your Home</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
              Connect with verified, skilled tradespeople in your area. Post your job, receive competitive quotes, and get the work done right.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/register?role=homeowner"
                className="bg-secondary text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary-dark transition-colors"
              >
                I Need a Tradesperson
              </Link>
              <Link
                href="/register?role=contractor"
                className="bg-white text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
              >
                I'm a Tradesperson
              </Link>
            </div>
          </div>

          {/* Right Column - Desktop Mockup with Real Screenshots */}
          <div className="relative" suppressHydrationWarning>
            {/* Desktop/Laptop Mockup */}
            <div className="relative mx-auto w-full max-w-4xl" suppressHydrationWarning>
              {/* Laptop Base */}
              <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-2 shadow-2xl" suppressHydrationWarning>
                {/* Screen Bezel */}
                <div className="bg-black rounded-t-lg p-1" suppressHydrationWarning>
                  {/* Screen */}
                  <div className="bg-white rounded-t overflow-hidden relative shadow-inner" style={{ aspectRatio: '16/10' }} suppressHydrationWarning>
                    {/* Browser Chrome */}
                    <div className="bg-gray-100 border-b flex items-center justify-between px-4 py-2 z-10 relative">
                      {/* Browser Controls */}
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      {/* Address Bar */}
                      <div className="flex-1 mx-4 bg-white rounded px-3 py-1 text-xs text-gray-600 border">
                      </div>
                      {/* Browser Icons */}
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                    
                    {/* Screenshot Carousel */}
                    <div className="relative w-full h-[calc(100%-48px)] overflow-hidden bg-gray-50">
                      {screenshots.map((screenshot, index) => (
                        <div
                          key={index}
                          className={`absolute inset-0 transition-opacity duration-1000 ${
                            index === currentSlide ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <Image
                            src={screenshot.image}
                            alt={screenshot.alt}
                            fill
                            className="object-contain object-top"
                            priority={index === 0}
                            unoptimized
                            onError={(e) => {
                              console.warn(`Failed to load screenshot: ${screenshot.image}`);
                            }}
                          />
                          {/* Overlay with title */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                            <p className="text-white text-sm font-semibold">{screenshot.title}</p>
                            <p className="text-white/80 text-xs">{screenshot.description}</p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Fallback content if images don't load */}
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4 opacity-0 pointer-events-none">
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-primary mb-2">
                            {screenshots[currentSlide]?.title || 'Mintenance App'}
                          </h3>
                          <p className="text-base text-gray-600">
                            {screenshots[currentSlide]?.description || 'Real app screenshots'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Slide Indicators */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                      {screenshots.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`h-2 rounded-full transition-all ${
                            index === currentSlide
                              ? 'w-8 bg-secondary'
                              : 'w-2 bg-white/50 hover:bg-white/70'
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Laptop Keyboard/Hinge Area */}
                <div className="h-2 bg-gray-800 rounded-b"></div>
                <div className="h-1 bg-gray-700 rounded-b"></div>
              </div>
            </div>

            {/* Floating UI Elements - Repositioned for Desktop */}
            <div className="absolute -top-6 -left-12 bg-white rounded-lg p-4 shadow-xl border max-w-sm float-animation float-delay-1">
              <div className="absolute -top-1 -right-1">
                <span className="bg-secondary/10 text-secondary text-[9px] font-semibold px-1 py-0.5 rounded uppercase tracking-wide">
                  Demo
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">✓</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Job Posted!</p>
                  <p className="text-xs text-gray-600">3 quotes received</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-12 bg-white rounded-lg p-4 shadow-xl border max-w-sm float-animation float-delay-2">
              <div className="absolute -top-1 -right-1">
                <span className="bg-secondary/10 text-secondary text-[9px] font-semibold px-1 py-0.5 rounded uppercase tracking-wide">
                  Demo
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Quote Received</h4>
                <span className="text-sm text-secondary font-bold">£150</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">Kitchen tap repair</p>
              <div className="flex space-x-2">
                <button className="flex-1 bg-secondary text-white text-xs py-2 rounded font-medium">Accept</button>
                <button className="flex-1 bg-gray-200 text-gray-700 text-xs py-2 rounded font-medium">Decline</button>
              </div>
            </div>

            <div className="absolute top-1/2 -right-16 bg-white rounded-lg p-4 shadow-xl border float-animation float-delay-3">
              <div className="absolute -top-1 -right-1">
                <span className="bg-secondary/10 text-secondary text-[9px] font-semibold px-1 py-0.5 rounded uppercase tracking-wide">
                  Demo
                </span>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-base">⚡</span>
                </div>
                <p className="text-sm font-semibold">Job Started</p>
                <p className="text-xs text-gray-600">Plumber on site</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        title="See How It Works"
        message="These contractor cards show how Mintenance connects you with verified tradespeople. Sign up to browse real profiles, read reviews, and get quotes from skilled professionals in your area."
        ctaText="Sign Up to Get Started"
        ctaLink="/register?role=homeowner"
      />
    </section>
  );
}

