'use client';

import React from 'react';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';
import { GraduationCap, TrendingUp, Star } from 'lucide-react';

/**
 * Hero section for Resources page
 * Features gradient background with animated stats
 */
export function ResourceHero() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const heroStats = [
    { icon: GraduationCap, label: 'Active Guides', value: '50+' },
    { icon: TrendingUp, label: 'Avg. Growth', value: '40%' },
    { icon: Star, label: 'Success Rate', value: '95%' },
  ];

  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <MotionH1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            Contractor Resources &amp; Growth Tools
          </MotionH1>
          <MotionP
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto"
          >
            Everything you need to succeed on the Mintenance platform and grow your contracting business
          </MotionP>
        </div>

        {/* Stats Grid */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16"
        >
          {heroStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <MotionDiv
                key={index}
                variants={staggerItem}
                className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/30 transition-colors duration-300"
              >
                <Icon className="w-8 h-8 mx-auto mb-3 text-teal-200" aria-hidden="true" />
                <p className="text-3xl font-bold mb-2">{stat.value}</p>
                <p className="text-teal-100">{stat.label}</p>
              </MotionDiv>
            );
          })}
        </MotionDiv>
      </div>
    </MotionDiv>
  );
}
