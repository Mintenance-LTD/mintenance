'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DemoModal } from '../ui/DemoModal';

/**
 * Hero section for landing page
 * Main call-to-action with phone mockup visual
 */
export function HeroSection() {
  const [showDemoModal, setShowDemoModal] = useState(false);

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

          {/* Right Column - Phone Mockup */}
          <div className="relative">
            {/* Main Phone Mockup */}
            <div className="relative mx-auto w-80 h-[600px] bg-black rounded-[3rem] p-2 shadow-2xl">
              <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                {/* Phone Status Bar */}
                <div className="flex justify-between items-center px-6 py-3 bg-white border-b">
                  <span className="text-sm font-semibold">9:41</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-2 bg-black rounded-sm"></div>
                    <div className="w-4 h-2 bg-black rounded-sm"></div>
                    <div className="w-4 h-2 bg-black rounded-sm"></div>
                  </div>
                </div>
                
                {/* App Content */}
                <div className="p-4">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-primary">Find Contractors</h3>
                    <p className="text-sm text-gray-600">Near you</p>
                  </div>
                  
                  {/* Contractor Cards */}
                  <div className="space-y-3">
                    {[
                      { name: 'Mike Johnson', role: 'Plumber', rating: '4.9', color: '#10B981', initials: 'MJ' },
                      { name: 'Sarah Clarke', role: 'Electrician', rating: '4.8', color: '#F59E0B', initials: 'SC' },
                      { name: 'David Wilson', role: 'Carpenter', rating: '4.9', color: '#8B5CF6', initials: 'DW' }
                    ].map((contractor) => (
                      <div key={contractor.name} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: contractor.color }}>
                            <span className="text-white font-bold text-sm">{contractor.initials}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{contractor.name}</h4>
                            <p className="text-xs text-gray-600">{contractor.role} • {contractor.rating}★</p>
                          </div>
                          <button 
                            onClick={() => setShowDemoModal(true)}
                            className="bg-secondary text-white px-3 py-1 rounded text-xs hover:bg-secondary-dark transition-colors"
                          >
                            Contact
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating UI Elements */}
            <div className="absolute -top-4 -left-8 bg-white rounded-lg p-3 shadow-lg border max-w-xs float-animation float-delay-1">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold">Job Posted!</p>
                  <p className="text-xs text-gray-600">3 quotes received</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-8 -right-8 bg-white rounded-lg p-4 shadow-lg border max-w-xs float-animation float-delay-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Quote Received</h4>
                <span className="text-xs text-secondary">£150</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">Kitchen tap repair</p>
              <div className="flex space-x-2">
                <button className="flex-1 bg-secondary text-white text-xs py-1 rounded">Accept</button>
                <button className="flex-1 bg-gray-200 text-gray-700 text-xs py-1 rounded">Decline</button>
              </div>
            </div>

            <div className="absolute top-1/2 -right-12 bg-white rounded-lg p-3 shadow-lg border float-animation float-delay-3">
              <div className="text-center">
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-xs">⚡</span>
                </div>
                <p className="text-xs font-semibold">Job Started</p>
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
        title="This is a Demo"
        message="These contractor cards are for demonstration purposes. Sign up to contact real verified tradespeople and get your projects done!"
        ctaText="Sign Up to Get Started"
        ctaLink="/register?role=homeowner"
      />
    </section>
  );
}

