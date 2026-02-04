'use client';

import React from 'react';
import { Cpu, Shield } from 'lucide-react';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 py-24 sm:py-32"
      aria-labelledby="hero-heading"
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* AI Icon with gradient border */}
          <MotionDiv
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-300 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <Cpu className="w-16 h-16 text-amber-300" aria-hidden="true" />
              </div>
            </div>
          </MotionDiv>

          {/* Heading */}
          <MotionH1
            id="hero-heading"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6"
          >
            Try Mint AI Assessment
          </MotionH1>

          {/* Subheading */}
          <MotionP
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl text-white/90 mb-8 max-w-3xl mx-auto"
          >
            Upload photos of property damage and get instant AI-powered cost estimates
          </MotionP>

          {/* Trust badge */}
          <MotionDiv
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20"
          >
            <Shield className="w-5 h-5 text-emerald-300" aria-hidden="true" />
            <span className="text-white font-medium">
              Powered by Advanced Computer Vision
            </span>
          </MotionDiv>

          {/* Skip to upload link for accessibility */}
          <div className="mt-8">
            <a
              href="#upload-section"
              className="text-white/80 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              Skip to upload
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
