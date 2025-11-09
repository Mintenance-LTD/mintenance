'use client';

/**
 * Example Usage of PricingTable and ResponsiveGrid Components
 * 
 * This file demonstrates how to use the new components with proper typography
 * and responsive design patterns.
 */

import React from 'react';
import { PricingTable, PricingPlan } from '@/components/ui/PricingTable';
import { ResponsiveGrid, GridArea } from '@/components/ui/ResponsiveGrid';

// Example pricing plans data
const examplePlans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 19.99,
    currency: 'GBP',
    period: 'month',
    features: [
      'Up to 10 jobs',
      '5 active jobs',
      'Email support',
      'Basic analytics',
      'Mobile app access',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 49.99,
    currency: 'GBP',
    period: 'month',
    features: [
      'Up to 50 jobs',
      '20 active jobs',
      'Priority support',
      'Advanced analytics',
      'Mobile app access',
      'Custom reports',
    ],
    recommended: true,
    badge: 'MOST POPULAR',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    currency: 'GBP',
    period: 'month',
    features: [
      'Unlimited jobs',
      'Unlimited active jobs',
      '24/7 priority support',
      'Advanced analytics',
      'Custom branding',
      'API access',
      'Dedicated account manager',
    ],
  },
];

export function PricingExample() {
  const handleSelectPlan = (planId: string) => {
    console.log('Selected plan:', planId);
    // Handle plan selection logic here
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Heading */}
      <div className="text-center mb-12">
        <h1 className="text-heading-lg font-[640] text-gray-900 mb-4 tracking-tighter">
          Choose Your Plan
        </h1>
        <p className="text-subheading-md font-[560] text-gray-600">
          Select the perfect plan for your business needs
        </p>
      </div>

      {/* Pricing Table */}
      <PricingTable
        plans={examplePlans}
        onSelectPlan={handleSelectPlan}
        isLoading={false}
      />
    </div>
  );
}

export function ResponsiveGridExample() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-heading-md font-[640] text-gray-900 mb-8 tracking-tighter">
        Responsive Grid Layout Example
      </h2>

      <ResponsiveGrid
        areas={{
          mobile: [
            ['header'],
            ['main'],
            ['sidebar'],
            ['footer'],
          ],
          tablet: [
            ['header', 'header'],
            ['sidebar', 'main'],
            ['footer', 'footer'],
          ],
          desktop: [
            ['header', 'header', 'header'],
            ['sidebar', 'main', 'aside'],
            ['footer', 'footer', 'footer'],
          ],
        }}
        gap="lg"
        className="min-h-[600px]"
      >
        <GridArea
          area="header"
          className="bg-primary-600 text-white p-6 rounded-lg flex items-center justify-center"
        >
          <h3 className="text-subheading-lg font-[560]">Header</h3>
        </GridArea>

        <GridArea
          area="sidebar"
          className="bg-gray-100 p-6 rounded-lg"
        >
          <h3 className="text-subheading-md font-[560] mb-4">Sidebar</h3>
          <p className="text-base font-[460] text-gray-700 leading-normal">
            Sidebar content goes here. This area adapts to different screen sizes.
          </p>
        </GridArea>

        <GridArea
          area="main"
          className="bg-white border-2 border-gray-200 p-6 rounded-lg"
        >
          <h3 className="text-subheading-md font-[560] mb-4">Main Content</h3>
          <p className="text-base font-[460] text-gray-700 leading-normal mb-4">
            Main content area. This is the primary focus of the layout.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm font-[460] text-gray-600">Widget 1</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm font-[460] text-gray-600">Widget 2</p>
            </div>
          </div>
        </GridArea>

        <GridArea
          area="aside"
          className="bg-accent-50 p-6 rounded-lg"
        >
          <h3 className="text-subheading-md font-[560] mb-4">Aside</h3>
          <p className="text-base font-[460] text-gray-700 leading-normal">
            Additional content or widgets appear here on desktop.
          </p>
        </GridArea>

        <GridArea
          area="footer"
          className="bg-gray-800 text-white p-6 rounded-lg flex items-center justify-center"
        >
          <p className="text-sm font-[460]">Footer Content</p>
        </GridArea>
      </ResponsiveGrid>
    </div>
  );
}

export function CombinedExample() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PricingExample />
      <div className="mt-16">
        <ResponsiveGridExample />
      </div>
    </div>
  );
}

