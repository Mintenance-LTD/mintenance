'use client';

/**
 * FirstUseEmptyState Component
 * Encouraging empty states with clear CTAs for first-time users
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  MessageSquare,
  Home,
  FileText,
  Sparkles,
  ArrowRight,
  BookOpen,
  LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateTip {
  icon: LucideIcon;
  text: string;
}

interface FirstUseEmptyStateProps {
  type:
    | 'no-jobs-homeowner'
    | 'no-jobs-contractor'
    | 'no-bids'
    | 'no-messages'
    | 'no-properties'
    | 'no-portfolio';
  title?: string;
  description?: string;
  actions?: EmptyStateAction[];
  tips?: EmptyStateTip[];
  illustration?: React.ReactNode;
}

const defaultConfigs = {
  'no-jobs-homeowner': {
    title: 'Post Your First Job',
    description:
      'Get started by describing the work you need done. Our AI will match you with qualified contractors in your area.',
    illustration: <Briefcase className="w-24 h-24 text-blue-300" />,
    actions: [
      {
        label: 'Post a Job',
        href: '/jobs/create',
        variant: 'primary' as const,
      },
      {
        label: 'Browse Contractors',
        href: '/contractors',
        variant: 'secondary' as const,
      },
    ],
    tips: [
      {
        icon: Sparkles,
        text: 'Include photos for better matches',
      },
      {
        icon: BookOpen,
        text: 'Be specific about your timeline',
      },
      {
        icon: FileText,
        text: 'Describe the problem in detail',
      },
    ],
  },
  'no-jobs-contractor': {
    title: 'Start Discovering Jobs',
    description:
      'Swipe through jobs matched to your skills and location. Find your next project in seconds.',
    illustration: <Briefcase className="w-24 h-24 text-blue-300" />,
    actions: [
      {
        label: 'Discover Jobs',
        href: '/contractor/discover',
        variant: 'primary' as const,
      },
      {
        label: 'Complete Profile',
        href: '/contractor/profile',
        variant: 'secondary' as const,
      },
    ],
    tips: [
      {
        icon: Sparkles,
        text: 'Complete your profile for better matches',
      },
      {
        icon: BookOpen,
        text: 'Upload portfolio photos to stand out',
      },
      {
        icon: FileText,
        text: 'Respond quickly to win more jobs',
      },
    ],
  },
  'no-bids': {
    title: 'No Bids Yet',
    description:
      'Contractors will start submitting bids soon. We\'ve matched your job with qualified professionals in your area.',
    illustration: <FileText className="w-24 h-24 text-blue-300" />,
    actions: [
      {
        label: 'View Matched Contractors',
        href: '/contractors',
        variant: 'primary' as const,
      },
    ],
    tips: [
      {
        icon: Sparkles,
        text: 'Check back in 24-48 hours',
      },
      {
        icon: BookOpen,
        text: 'Add more details to attract bids',
      },
      {
        icon: MessageSquare,
        text: 'Invite contractors to bid',
      },
    ],
  },
  'no-messages': {
    title: 'No Messages Yet',
    description:
      'Your conversations with contractors will appear here. Once you accept a bid or reach out, you can chat directly.',
    illustration: <MessageSquare className="w-24 h-24 text-blue-300" />,
    actions: [
      {
        label: 'Browse Jobs',
        href: '/jobs',
        variant: 'primary' as const,
      },
    ],
    tips: [
      {
        icon: Sparkles,
        text: 'Messages are real-time',
      },
      {
        icon: BookOpen,
        text: 'Schedule video calls directly',
      },
      {
        icon: FileText,
        text: 'Share photos and documents',
      },
    ],
  },
  'no-properties': {
    title: 'Add Your First Property',
    description:
      'Add details about your home to help contractors understand your needs and provide accurate quotes.',
    illustration: <Home className="w-24 h-24 text-blue-300" />,
    actions: [
      {
        label: 'Add Property',
        href: '/properties/add',
        variant: 'primary' as const,
      },
    ],
    tips: [
      {
        icon: Sparkles,
        text: 'Include property age and type',
      },
      {
        icon: BookOpen,
        text: 'Add photos of exterior/interior',
      },
      {
        icon: FileText,
        text: 'Note any special features',
      },
    ],
  },
  'no-portfolio': {
    title: 'Build Your Portfolio',
    description:
      'Showcase your best work with before/after photos. Contractors with portfolios win 3x more jobs.',
    illustration: <Sparkles className="w-24 h-24 text-blue-300" />,
    actions: [
      {
        label: 'Upload Photos',
        href: '/contractor/profile',
        variant: 'primary' as const,
      },
    ],
    tips: [
      {
        icon: Sparkles,
        text: 'Upload high-quality photos',
      },
      {
        icon: BookOpen,
        text: 'Show before and after',
      },
      {
        icon: FileText,
        text: 'Add descriptions to photos',
      },
    ],
  },
};

export function FirstUseEmptyState({
  type,
  title,
  description,
  actions,
  tips,
  illustration,
}: FirstUseEmptyStateProps) {
  const router = useRouter();
  const config = defaultConfigs[type];

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActions = actions || config.actions;
  const displayTips = tips || config.tips;
  const displayIllustration = illustration || config.illustration;

  const handleAction = (action: EmptyStateAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-2xl mx-auto"
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full"
      >
        {displayIllustration}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-gray-900 mb-4"
      >
        {displayTitle}
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-gray-600 mb-8 max-w-lg"
      >
        {displayDescription}
      </motion.p>

      {/* Actions */}
      {displayActions && displayActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-12"
        >
          {displayActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleAction(action)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                action.variant === 'primary'
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600'
              }`}
            >
              {action.label}
              {action.variant === 'primary' && (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          ))}
        </motion.div>
      )}

      {/* Tips */}
      {displayTips && displayTips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full"
        >
          <div className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Pro Tips
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayTips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <tip.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-700 text-left leading-relaxed">
                    {tip.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default FirstUseEmptyState;
