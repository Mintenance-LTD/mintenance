'use client';

import React from 'react';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import Link from 'next/link';
import { MotionButton, MotionDiv, MotionH1, MotionP, MotionSection } from '@/components/ui/MotionDiv';
import { UnifiedButton } from '@/components/ui';

interface WelcomeHero2025Props {
  userName: string;
  activeJobsCount: number;
  propertiesCount: number;
}

export function WelcomeHero2025({ userName, activeJobsCount, propertiesCount }: WelcomeHero2025Props) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = userName.split(' ')[0] || userName;

  return (
    <MotionSection
      className="relative bg-gradient-hero rounded-2xl p-8 mb-8 overflow-hidden"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl -ml-24 -mb-24" />

      <div className="relative z-10">
        <MotionDiv
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
        >
          {/* Left: Greeting */}
          <div className="text-white">
            <MotionP
              variants={staggerItem}
              className="text-lg font-medium mb-2 text-teal-50"
            >
              {getGreeting()},
            </MotionP>
            <MotionH1
              variants={staggerItem}
              className="text-4xl md:text-5xl font-bold mb-3"
            >
              {firstName}
            </MotionH1>
            <MotionP
              variants={staggerItem}
              className="text-teal-50 text-base max-w-xl"
            >
              {activeJobsCount > 0
                ? `You have ${activeJobsCount} active ${activeJobsCount === 1 ? 'job' : 'jobs'} in progress.`
                : "You're all caught up! Ready to start a new project?"
              }
            </MotionP>
          </div>

          {/* Right: Quick Actions */}
          <MotionDiv
            variants={staggerItem}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link href="/jobs/create">
              <UnifiedButton
                variant="primary"
                size="lg"
                className="bg-white text-teal-700 hover:bg-gray-50 shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                + Post New Job
              </UnifiedButton>
            </Link>
            <Link href="/properties">
              <UnifiedButton
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 hover:bg-white/20 whitespace-nowrap"
              >
                Manage Properties ({propertiesCount})
              </UnifiedButton>
            </Link>
          </MotionDiv>
        </MotionDiv>

        {/* Bottom: Quick Stats */}
        <MotionDiv
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.3 }}
          className="mt-8 pt-6 border-t border-white/20"
        >
          <div className="grid grid-cols-3 gap-4 text-white">
            <div>
              <div className="text-2xl font-bold">{activeJobsCount}</div>
              <div className="text-sm text-teal-50">Active Jobs</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{propertiesCount}</div>
              <div className="text-sm text-teal-50">Properties</div>
            </div>
            <div>
              <div className="text-2xl font-bold">4.8★</div>
              <div className="text-sm text-teal-50">Avg Rating</div>
            </div>
          </div>
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
