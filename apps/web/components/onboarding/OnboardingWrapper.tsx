'use client';

import React, { useState, useEffect } from 'react';
import { WelcomeModal } from './WelcomeModal';
import { TooltipManager, type TooltipConfig } from './TooltipManager';

interface OnboardingWrapperProps {
  userRole: 'homeowner' | 'contractor';
  onboardingCompleted: boolean;
  children: React.ReactNode;
}

// Tooltip configurations for each role
const homeownerTooltips: TooltipConfig[] = [
  {
    id: 'dashboard-kpis',
    targetId: 'dashboard-kpis',
    title: 'Your Dashboard Overview',
    description: 'Track your jobs, bids received, and properties at a glance. These KPIs update in real-time.',
    position: 'bottom',
  },
  {
    id: 'create-job-button',
    targetId: 'create-job-button',
    title: 'Post a New Job',
    description: 'Click here to create a new job posting. Add details, photos, and budget to get bids from contractors.',
    position: 'bottom',
  },
  {
    id: 'messages-icon',
    targetId: 'messages-icon',
    title: 'Messages',
    description: 'Communicate with contractors securely. Discuss project details and view quotes here.',
    position: 'right',
  },
  {
    id: 'properties-section',
    targetId: 'properties-section',
    title: 'Manage Properties',
    description: 'Add and manage your properties. Each property can have multiple jobs associated with it.',
    position: 'bottom',
  },
  {
    id: 'financials-section',
    targetId: 'financials-section',
    title: 'Financials',
    description: 'Track all your payments, invoices, and escrow transactions. View your spending history here.',
    position: 'bottom',
  },
];

const contractorTooltips: TooltipConfig[] = [
  {
    id: 'dashboard-metrics',
    targetId: 'dashboard-metrics',
    title: 'Your Business Metrics',
    description: 'Track your revenue, active jobs, and project progress. Monitor your business performance here.',
    position: 'bottom',
  },
  {
    id: 'jobs-bids-section',
    targetId: 'jobs-bids-section',
    title: 'Jobs & Bids',
    description: 'Browse available jobs and submit bids. Use the "Recommended" tab to see jobs matching your skills.',
    position: 'bottom',
  },
  {
    id: 'submit-bid-button',
    targetId: 'submit-bid-button',
    title: 'Submit Detailed Bids',
    description: 'When you find a job, submit a detailed bid with line items and breakdowns to win more projects.',
    position: 'bottom',
  },
  {
    id: 'crm-section',
    targetId: 'crm-section',
    title: 'Customer Management',
    description: 'Manage your client relationships. Track repeat clients and view customer history.',
    position: 'bottom',
  },
  {
    id: 'quotes-section',
    targetId: 'quotes-section',
    title: 'Quotes & Invoices',
    description: 'Create and manage quotes for your clients. Track sent, accepted, and rejected quotes.',
    position: 'bottom',
  },
];

export function OnboardingWrapper({ userRole, onboardingCompleted, children }: OnboardingWrapperProps) {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    // Check if onboarding is completed
    if (!onboardingCompleted) {
      // Show welcome modal first
      setShowWelcomeModal(true);
    }
  }, [onboardingCompleted]);

  const handleWelcomeComplete = async () => {
    setShowWelcomeModal(false);
    // Mark onboarding as complete
    setIsCompleting(true);
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
      });

      if (response.ok) {
        // Show tooltips after welcome modal
        setShowTooltips(true);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleWelcomeSkip = () => {
    setShowWelcomeModal(false);
    // Still show tooltips even if skipped
    setShowTooltips(true);
  };

  const handleTooltipsComplete = () => {
    setShowTooltips(false);
    // Mark onboarding as complete when tooltips are done
    if (!onboardingCompleted) {
      fetch('/api/onboarding/complete', {
        method: 'POST',
      }).catch(console.error);
    }
  };

  const tooltips = userRole === 'contractor' ? contractorTooltips : homeownerTooltips;

  return (
    <>
      {children}
      
      <WelcomeModal
        isOpen={showWelcomeModal && !onboardingCompleted}
        userRole={userRole}
        onComplete={handleWelcomeComplete}
        onSkip={handleWelcomeSkip}
      />
      
      <TooltipManager
        tooltips={tooltips}
        enabled={showTooltips && !onboardingCompleted}
        onComplete={handleTooltipsComplete}
      />
    </>
  );
}

