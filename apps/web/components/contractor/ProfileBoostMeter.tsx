'use client';

import React from 'react';
import { TrendingUp, Award, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export type ProfileBoostTier = 'standard' | 'verified' | 'premium' | 'elite';

interface ProfileBoostMeterProps {
  rankingScore: number; // 0-100
  totalBoostPercentage: number;
  tier: ProfileBoostTier;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TIER_CONFIG = {
  elite: {
    label: 'Elite',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-gradient-to-r from-purple-100 to-pink-100',
    textColor: 'text-purple-700',
    icon: '⭐',
    minScore: 80,
  },
  premium: {
    label: 'Premium',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-gradient-to-r from-blue-100 to-cyan-100',
    textColor: 'text-blue-700',
    icon: '💎',
    minScore: 60,
  },
  verified: {
    label: 'Verified',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-gradient-to-r from-emerald-100 to-teal-100',
    textColor: 'text-emerald-700',
    icon: '✓',
    minScore: 40,
  },
  standard: {
    label: 'Standard',
    color: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: '○',
    minScore: 0,
  },
};

export function ProfileBoostMeter({
  rankingScore,
  totalBoostPercentage,
  tier,
  showDetails = true,
  size = 'md',
  className = '',
}: ProfileBoostMeterProps) {
  const tierConfig = TIER_CONFIG[tier];

  const sizeClasses = {
    sm: {
      container: 'p-3',
      title: 'text-sm',
      score: 'text-2xl',
      bar: 'h-2',
      detail: 'text-xs',
    },
    md: {
      container: 'p-4',
      title: 'text-base',
      score: 'text-3xl',
      bar: 'h-3',
      detail: 'text-sm',
    },
    lg: {
      container: 'p-6',
      title: 'text-lg',
      score: 'text-4xl',
      bar: 'h-4',
      detail: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${classes.container} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h3 className={`font-semibold text-gray-900 ${classes.title}`}>
            Profile Boost
          </h3>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${tierConfig.bgColor}`}>
          <span className="text-sm">{tierConfig.icon}</span>
          <span className={`font-bold ${classes.detail} ${tierConfig.textColor}`}>
            {tierConfig.label}
          </span>
        </div>
      </div>

      {/* Ranking Score */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`font-bold ${tierConfig.textColor} ${classes.score}`}>
            {rankingScore}
          </span>
          <span className={`text-gray-500 ${classes.detail}`}>/ 100</span>
        </div>

        {/* Progress Bar */}
        <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${classes.bar}`}>
          <motion.div
            className={`h-full bg-gradient-to-r ${tierConfig.color} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${rankingScore}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        {/* Score Markers */}
        <div className="flex justify-between mt-1">
          <span className={`text-gray-400 ${classes.detail}`}>0</span>
          <span className={`text-gray-400 ${classes.detail}`}>40</span>
          <span className={`text-gray-400 ${classes.detail}`}>60</span>
          <span className={`text-gray-400 ${classes.detail}`}>80</span>
          <span className={`text-gray-400 ${classes.detail}`}>100</span>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="pt-3 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-gray-600 ${classes.detail}`}>Total Boost:</span>
            <span className={`font-semibold ${tierConfig.textColor} ${classes.detail}`}>
              +{totalBoostPercentage}%
            </span>
          </div>

          {/* Next Tier Progress */}
          {tier !== 'elite' && (
            <div className={`text-gray-500 ${classes.detail}`}>
              {(() => {
                const nextTier = tier === 'standard' ? 'verified' : tier === 'verified' ? 'premium' : 'elite';
                const nextTierConfig = TIER_CONFIG[nextTier];
                const pointsNeeded = nextTierConfig.minScore - rankingScore;

                return (
                  <div className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    <span>
                      {pointsNeeded} points to {nextTierConfig.label}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for dashboards
 */
export function CompactProfileBoostMeter({
  rankingScore,
  tier,
}: {
  rankingScore: number;
  tier: ProfileBoostTier;
}) {
  const tierConfig = TIER_CONFIG[tier];

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Profile Boost</span>
          <span className={`text-sm font-bold ${tierConfig.textColor}`}>
            {rankingScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${tierConfig.color} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${rankingScore}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>
      <div className={`px-2 py-1 rounded-md ${tierConfig.bgColor}`}>
        <span className={`text-xs font-bold ${tierConfig.textColor}`}>
          {tierConfig.icon} {tierConfig.label}
        </span>
      </div>
    </div>
  );
}

/**
 * Tier badge only
 */
export function TierBadge({ tier }: { tier: ProfileBoostTier }) {
  const tierConfig = TIER_CONFIG[tier];

  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${tierConfig.bgColor}`}>
      <span>{tierConfig.icon}</span>
      <span className={`text-sm font-bold ${tierConfig.textColor}`}>
        {tierConfig.label}
      </span>
    </div>
  );
}
