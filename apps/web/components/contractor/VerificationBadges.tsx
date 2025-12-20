'use client';

import React from 'react';
import { Shield, Brain, CheckCircle, Phone, Mail, Award, Briefcase, FileCheck } from 'lucide-react';

export interface VerificationBadge {
  type: 'dbs' | 'personality' | 'admin' | 'phone' | 'email' | 'portfolio' | 'skills' | 'insurance';
  verified: boolean;
  level?: 'basic' | 'standard' | 'enhanced'; // For DBS
  score?: number; // For personality
}

interface VerificationBadgesProps {
  badges: VerificationBadge[];
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical' | 'grid';
  showLabels?: boolean;
  className?: string;
}

const BADGE_CONFIG = {
  dbs: {
    icon: Shield,
    label: 'DBS Verified',
    colors: {
      basic: 'bg-blue-100 text-blue-700 border-blue-300',
      standard: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      enhanced: 'bg-purple-100 text-purple-700 border-purple-300',
      unverified: 'bg-gray-100 text-gray-400 border-gray-300',
    },
    labelByLevel: {
      basic: 'Basic DBS',
      standard: 'Standard DBS',
      enhanced: 'Enhanced DBS',
    },
  },
  personality: {
    icon: Brain,
    label: 'Personality Assessed',
    colors: {
      verified: 'bg-teal-100 text-teal-700 border-teal-300',
      unverified: 'bg-gray-100 text-gray-400 border-gray-300',
    },
  },
  admin: {
    icon: CheckCircle,
    label: 'Admin Verified',
    colors: {
      verified: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      unverified: 'bg-gray-100 text-gray-400 border-gray-300',
    },
  },
  phone: {
    icon: Phone,
    label: 'Phone Verified',
    colors: {
      verified: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      unverified: 'bg-gray-100 text-gray-400 border-gray-300',
    },
  },
  email: {
    icon: Mail,
    label: 'Email Verified',
    colors: {
      verified: 'bg-sky-100 text-sky-700 border-sky-300',
      unverified: 'bg-gray-100 text-gray-400 border-gray-300',
    },
  },
  portfolio: {
    icon: Award,
    label: 'Portfolio Complete',
    colors: {
      verified: 'bg-amber-100 text-amber-700 border-amber-300',
      unverified: 'bg-gray-100 text-gray-400 border-gray-300',
    },
  },
  skills: {
    icon: Briefcase,
    label: 'Skills Certified',
    colors: {
      verified: 'bg-orange-100 text-orange-700 border-orange-300',
      unverified: 'bg-gray-100 text-gray-400 border-gray-300',
    },
  },
  insurance: {
    icon: FileCheck,
    label: 'Insurance Verified',
    colors: {
      verified: 'bg-rose-100 text-rose-700 border-rose-300',
      unverified: 'bg-gray-100 text-gray-400 border-gray-300',
    },
  },
};

const SIZE_CLASSES = {
  sm: {
    icon: 'w-3 h-3',
    badge: 'px-2 py-0.5 text-xs',
    gap: 'gap-1',
  },
  md: {
    icon: 'w-4 h-4',
    badge: 'px-3 py-1 text-sm',
    gap: 'gap-1.5',
  },
  lg: {
    icon: 'w-5 h-5',
    badge: 'px-4 py-1.5 text-base',
    gap: 'gap-2',
  },
};

export function VerificationBadges({
  badges,
  size = 'md',
  layout = 'horizontal',
  showLabels = true,
  className = '',
}: VerificationBadgesProps) {
  const sizeClasses = SIZE_CLASSES[size];

  const layoutClasses = {
    horizontal: `flex flex-wrap ${sizeClasses.gap}`,
    vertical: `flex flex-col ${sizeClasses.gap}`,
    grid: `grid grid-cols-2 sm:grid-cols-3 ${sizeClasses.gap}`,
  };

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {badges.map((badge) => {
        const config = BADGE_CONFIG[badge.type];
        const Icon = config.icon;

        // Determine color based on verification status and type
        let colorClass: string;
        let label: string = config.label;

        if (badge.type === 'dbs' && badge.verified && badge.level) {
          colorClass = config.colors[badge.level];
          label = config.labelByLevel[badge.level];
        } else {
          colorClass = badge.verified
            ? (config.colors as any).verified || config.colors.enhanced
            : (config.colors as any).unverified;
        }

        return (
          <div
            key={badge.type}
            className={`
              inline-flex items-center ${sizeClasses.gap} ${sizeClasses.badge}
              font-semibold rounded-lg border
              ${colorClass}
              transition-all duration-200
              ${badge.verified ? 'hover:shadow-sm' : 'opacity-60'}
            `}
            title={badge.verified ? label : `${label} (Not verified)`}
          >
            <Icon className={sizeClasses.icon} />
            {showLabels && <span>{label}</span>}
            {badge.type === 'personality' && badge.score && (
              <span className="ml-1 opacity-75">({badge.score})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact version for contractor cards in search results
 */
export function CompactVerificationBadges({ badges }: { badges: VerificationBadge[] }) {
  const verifiedBadges = badges.filter(b => b.verified);

  if (verifiedBadges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {verifiedBadges.map((badge) => {
        const config = BADGE_CONFIG[badge.type];
        const Icon = config.icon;

        let colorClass: string;
        if (badge.type === 'dbs' && badge.level) {
          colorClass = config.colors[badge.level];
        } else {
          colorClass = (config.colors as any).verified || config.colors.enhanced;
        }

        return (
          <div
            key={badge.type}
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${colorClass}`}
            title={config.label}
          >
            <Icon className="w-3 h-3" />
          </div>
        );
      })}
    </div>
  );
}
