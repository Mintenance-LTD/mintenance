/**
 * Educational Empty State Component
 *
 * Provides contextual education and actionable next steps for empty states
 * across the application. Each empty state includes:
 * - Relevant icon/illustration
 * - Context-specific messaging
 * - 1-2 actionable next steps
 * - Support links when applicable
 */

import React from 'react';
import {
  BriefcaseIcon,
  MapPinIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CameraIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CurrencyPoundIcon,
  CalendarIcon,
  DocumentCheckIcon,
  BellAlertIcon,
  StarIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { unifiedTokens } from '@mintenance/design-tokens/src/unified-tokens';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type EmptyStateType =
  | 'jobs'
  | 'jobs-contractor'
  | 'bids'
  | 'messages'
  | 'notifications'
  | 'revenue'
  | 'properties'
  | 'contractors'
  | 'portfolio'
  | 'schedule'
  | 'quotes'
  | 'reviews'
  | 'documents'
  | 'team'
  | 'connections';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant: 'primary' | 'secondary';
  icon?: React.ReactNode;
}

interface EmptyStateConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  tips?: string[];
  actions: EmptyStateAction[];
  supportLink?: {
    label: string;
    href: string;
  };
}

interface EmptyStateEducationalProps {
  type: EmptyStateType;
  customActions?: EmptyStateAction[];
  className?: string;
  userRole?: 'homeowner' | 'contractor';
  location?: string;
}

// ============================================
// EMPTY STATE CONFIGURATIONS
// ============================================

const getEmptyStateConfig = (
  type: EmptyStateType,
  userRole?: 'homeowner' | 'contractor',
  location?: string
): EmptyStateConfig => {
  const configs: Record<EmptyStateType, EmptyStateConfig> = {
    'jobs': {
      icon: <BriefcaseIcon className="w-16 h-16 text-teal-600" />,
      title: "No jobs posted yet",
      description: userRole === 'contractor'
        ? `Complete your profile and enable location to see jobs near ${location || 'you'}`
        : "Start your first maintenance project today",
      tips: userRole === 'contractor' ? [
        "Complete your profile to increase visibility",
        "Add skills and certifications",
        "Enable location services for nearby jobs",
        "Upload portfolio photos to build trust",
      ] : [
        "Take photos of areas needing work",
        "Describe the issue in detail",
        "Set a realistic budget range",
      ],
      actions: userRole === 'contractor' ? [
        {
          label: "Complete Profile",
          href: "/contractor/profile",
          variant: "primary",
          icon: <UserGroupIcon className="w-4 h-4" />,
        },
        {
          label: "Enable Jobs Near You",
          href: "/contractor/settings",
          variant: "secondary",
          icon: <MapPinIcon className="w-4 h-4" />,
        },
      ] : [
        {
          label: "Post Your First Job",
          href: "/jobs/create",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
        {
          label: "Browse Contractors",
          href: "/contractors",
          variant: "secondary",
        },
      ],
      supportLink: {
        label: userRole === 'contractor' ? "How to get more jobs" : "How to post a job",
        href: userRole === 'contractor' ? "/help/contractor-jobs" : "/help/posting-jobs",
      },
    },

    'jobs-contractor': {
      icon: <WrenchScrewdriverIcon className="w-16 h-16 text-teal-600" />,
      title: "No active jobs",
      description: `Browse available jobs near ${location || 'your area'} and start bidding`,
      tips: [
        "Set competitive prices to win more bids",
        "Respond quickly to job postings",
        "Maintain a high rating for better visibility",
        "Enable notifications for new jobs",
      ],
      actions: [
        {
          label: "Discover Jobs",
          href: "/contractor/discover",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
        {
          label: "Jobs Near You",
          href: "/contractor/jobs-near-you",
          variant: "secondary",
          icon: <MapPinIcon className="w-4 h-4" />,
        },
      ],
      supportLink: {
        label: "Tips for winning bids",
        href: "/help/winning-bids",
      },
    },

    'bids': {
      icon: <DocumentTextIcon className="w-16 h-16 text-teal-600" />,
      title: "No bids received yet",
      description: "Your job will appear to qualified contractors in your area",
      tips: [
        "Jobs with photos receive 3x more bids",
        "Clear descriptions help contractors provide accurate quotes",
        "Flexible scheduling attracts more contractors",
      ],
      actions: [
        {
          label: "Edit Job Details",
          href: "#",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
        {
          label: "Invite Contractors",
          href: "/contractors",
          variant: "secondary",
        },
      ],
      supportLink: {
        label: "Why am I not getting bids?",
        href: "/help/no-bids",
      },
    },

    'messages': {
      icon: <ChatBubbleLeftRightIcon className="w-16 h-16 text-teal-600" />,
      title: "No messages yet",
      description: userRole === 'contractor'
        ? "Messages from homeowners will appear here"
        : "Start a conversation with a contractor",
      tips: [
        "Quick responses improve your rating",
        "Be clear about project requirements",
        "Ask for photos to better understand the job",
      ],
      actions: userRole === 'contractor' ? [
        {
          label: "Browse Active Jobs",
          href: "/contractor/discover",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
      ] : [
        {
          label: "Find Contractors",
          href: "/contractors",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
      ],
      supportLink: {
        label: "Messaging guidelines",
        href: "/help/messaging",
      },
    },

    'notifications': {
      icon: <BellAlertIcon className="w-16 h-16 text-teal-600" />,
      title: "All caught up!",
      description: "You'll be notified about important updates here",
      tips: [
        "Enable push notifications to never miss an update",
        "Customize which notifications you receive in settings",
      ],
      actions: [
        {
          label: "Notification Settings",
          href: "/settings#notifications",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
      ],
    },

    'revenue': {
      icon: <ChartBarIcon className="w-16 h-16 text-teal-600" />,
      title: "No revenue data yet",
      description: "Complete your first job to start tracking earnings",
      tips: [
        "Track all your income in one place",
        "Export reports for accounting",
        "Monitor trends to grow your business",
      ],
      actions: [
        {
          label: "Find Your First Job",
          href: "/contractor/discover",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
        {
          label: "Learn About Payments",
          href: "/help/payments",
          variant: "secondary",
        },
      ],
      supportLink: {
        label: "Understanding revenue reports",
        href: "/help/revenue",
      },
    },

    'properties': {
      icon: <HomeIcon className="w-16 h-16 text-teal-600" />,
      title: "No properties added",
      description: "Add your properties to streamline job posting",
      tips: [
        "Save time by reusing property details",
        "Track maintenance history by property",
        "Get tailored contractor recommendations",
      ],
      actions: [
        {
          label: "Add Your First Property",
          href: "/properties/add",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
      ],
      supportLink: {
        label: "Benefits of adding properties",
        href: "/help/properties",
      },
    },

    'contractors': {
      icon: <UserGroupIcon className="w-16 h-16 text-teal-600" />,
      title: "No contractors found",
      description: "Try adjusting your filters or expanding your search area",
      tips: [
        "Wider search radius shows more options",
        "Check different trade categories",
        "Save favorite contractors for future jobs",
      ],
      actions: [
        {
          label: "Clear Filters",
          onClick: () => {},
          variant: "primary",
        },
        {
          label: "Post a Job Instead",
          href: "/jobs/create",
          variant: "secondary",
        },
      ],
    },

    'portfolio': {
      icon: <CameraIcon className="w-16 h-16 text-teal-600" />,
      title: "Showcase your best work",
      description: "Upload photos of completed projects to win more jobs",
      tips: [
        "Before & after photos are most effective",
        "Add captions describing the work",
        "Include a variety of project types",
        "High quality photos build trust",
      ],
      actions: [
        {
          label: "Upload Photos",
          href: "/contractor/portfolio",
          variant: "primary",
          icon: <CameraIcon className="w-4 h-4" />,
        },
        {
          label: "Portfolio Tips",
          href: "/help/portfolio",
          variant: "secondary",
        },
      ],
      supportLink: {
        label: "Creating a winning portfolio",
        href: "/help/portfolio-guide",
      },
    },

    'schedule': {
      icon: <CalendarIcon className="w-16 h-16 text-teal-600" />,
      title: "Your calendar is clear",
      description: "Scheduled jobs and appointments will appear here",
      tips: [
        "Sync with your phone calendar",
        "Set buffer time between jobs",
        "Block out unavailable dates",
      ],
      actions: [
        {
          label: "Browse Available Jobs",
          href: "/contractor/discover",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
        {
          label: "Calendar Settings",
          href: "/settings#calendar",
          variant: "secondary",
        },
      ],
    },

    'quotes': {
      icon: <DocumentCheckIcon className="w-16 h-16 text-teal-600" />,
      title: "No quotes sent",
      description: "Create professional quotes to win more jobs",
      tips: [
        "Detailed quotes build trust",
        "Break down costs clearly",
        "Include payment terms",
        "Add your business details",
      ],
      actions: [
        {
          label: "Create Your First Quote",
          href: "/contractor/quotes/create",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
        {
          label: "Quote Templates",
          href: "/contractor/quotes/templates",
          variant: "secondary",
        },
      ],
      supportLink: {
        label: "Creating winning quotes",
        href: "/help/quotes",
      },
    },

    'reviews': {
      icon: <StarIcon className="w-16 h-16 text-teal-600" />,
      title: "No reviews yet",
      description: "Complete jobs to start building your reputation",
      tips: [
        "Quality work leads to great reviews",
        "Ask satisfied customers to leave feedback",
        "Respond professionally to all reviews",
      ],
      actions: [
        {
          label: "Find Jobs to Complete",
          href: "/contractor/discover",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
        {
          label: "Learn About Reviews",
          href: "/help/reviews",
          variant: "secondary",
        },
      ],
    },

    'documents': {
      icon: <DocumentTextIcon className="w-16 h-16 text-teal-600" />,
      title: "No documents uploaded",
      description: "Store important documents securely in one place",
      tips: [
        "Upload insurance certificates",
        "Store licenses and certifications",
        "Keep contracts organized",
      ],
      actions: [
        {
          label: "Upload Document",
          href: "/contractor/documents",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
      ],
    },

    'team': {
      icon: <UserGroupIcon className="w-16 h-16 text-teal-600" />,
      title: "Build your team",
      description: "Add team members to manage more jobs efficiently",
      tips: [
        "Assign jobs to team members",
        "Track individual performance",
        "Manage permissions and access",
      ],
      actions: [
        {
          label: "Invite Team Member",
          href: "/contractor/team/invite",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
        {
          label: "Learn About Teams",
          href: "/help/teams",
          variant: "secondary",
        },
      ],
    },

    'connections': {
      icon: <PuzzlePieceIcon className="w-16 h-16 text-teal-600" />,
      title: "Grow your network",
      description: "Connect with other contractors and homeowners",
      tips: [
        "Build relationships for referrals",
        "Follow contractors in complementary trades",
        "Engage with the community",
      ],
      actions: [
        {
          label: "Discover Contractors",
          href: "/contractor/social",
          variant: "primary",
          icon: <ArrowRightIcon className="w-4 h-4" />,
        },
      ],
    },
  };

  return configs[type];
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EmptyStateEducational: React.FC<EmptyStateEducationalProps> = ({
  type,
  customActions,
  className = '',
  userRole = 'homeowner',
  location = 'your area',
}) => {
  const config = getEmptyStateConfig(type, userRole, location);
  const actions = customActions || config.actions;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {/* Icon */}
      <div className="mb-6 p-4 bg-teal-50 rounded-full">
        {config.icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {config.title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 max-w-md mb-6">
        {config.description}
      </p>

      {/* Tips Section */}
      {config.tips && config.tips.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 max-w-md mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Tips:</h4>
          <ul className="text-sm text-gray-600 space-y-1 text-left">
            {config.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {actions.map((action, index) => {
          const isSecondary = action.variant === 'secondary';
          const buttonClass = isSecondary
            ? "inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all"
            : "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all";

          if (action.href) {
            return (
              <Link
                key={index}
                href={action.href}
                className={buttonClass}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Link>
            );
          }

          return (
            <button
              key={index}
              onClick={action.onClick}
              className={buttonClass}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Support Link */}
      {config.supportLink && (
        <Link
          href={config.supportLink.href}
          className="text-sm text-teal-600 hover:text-teal-700 underline transition-colors"
        >
          {config.supportLink.label}
        </Link>
      )}
    </div>
  );
};

// ============================================
// SIMPLIFIED EMPTY STATE (for backwards compatibility)
// ============================================

interface SimpleEmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export const SimpleEmptyState: React.FC<SimpleEmptyStateProps> = ({
  message,
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {icon && (
        <div className="mb-4 p-3 bg-gray-100 rounded-full">
          {icon}
        </div>
      )}
      <p className="text-gray-600 mb-4">{message}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all"
          >
            {action.label}
            <ArrowRightIcon className="ml-2 w-4 h-4" />
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all"
          >
            {action.label}
            <ArrowRightIcon className="ml-2 w-4 h-4" />
          </button>
        )
      )}
    </div>
  );
};

export default EmptyStateEducational;