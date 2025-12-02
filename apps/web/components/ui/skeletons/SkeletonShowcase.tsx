/**
 * SkeletonShowcase Component
 *
 * Developer reference showcasing all skeleton loader variants.
 * Use this as a visual guide for implementing skeletons in your pages.
 *
 * @example
 * // Add to your dev tools or component library
 * <SkeletonShowcase />
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import Skeleton, {
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonBadge,
  SkeletonImage,
} from './Skeleton';
import { JobCardSkeleton } from './JobCardSkeleton';
import { ContractorCardSkeleton } from './ContractorCardSkeleton';
import { DashboardSkeleton } from './DashboardSkeleton';
import { MessageListSkeleton } from './MessageListSkeleton';
import { FormSkeleton } from './FormSkeleton';
import { TableSkeleton } from './TableSkeleton';

export const SkeletonShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'basic' | 'cards' | 'complex'
  >('basic');

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Skeleton Loader System
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A comprehensive collection of skeleton loaders to improve perceived
          performance and keep users engaged during loading states.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('basic')}
          className={cn(
            'px-6 py-3 font-medium transition-all border-b-2',
            activeTab === 'basic'
              ? 'border-ck-blue-500 text-ck-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          Basic Components
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={cn(
            'px-6 py-3 font-medium transition-all border-b-2',
            activeTab === 'cards'
              ? 'border-ck-blue-500 text-ck-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          Card Skeletons
        </button>
        <button
          onClick={() => setActiveTab('complex')}
          className={cn(
            'px-6 py-3 font-medium transition-all border-b-2',
            activeTab === 'complex'
              ? 'border-ck-blue-500 text-ck-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          Complex Layouts
        </button>
      </div>

      {/* Content */}
      <div className="space-y-12">
        {/* Basic Components Tab */}
        {activeTab === 'basic' && (
          <>
            {/* Base Skeleton */}
            <ShowcaseSection
              title="Base Skeleton"
              description="The core skeleton component with customizable dimensions."
              code={`<Skeleton className="h-4 w-full" />
<Skeleton className="h-6 w-3/4" />
<Skeleton className="h-12 w-48 rounded-lg" />`}
            >
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-12 w-48 rounded-lg" />
              </div>
            </ShowcaseSection>

            {/* Text Skeleton */}
            <ShowcaseSection
              title="Text Skeleton"
              description="Multi-line text placeholder with automatic width variation."
              code={`<SkeletonText lines={3} />
<SkeletonText lines={5} />`}
            >
              <div className="space-y-6">
                <SkeletonText lines={3} />
                <SkeletonText lines={5} />
              </div>
            </ShowcaseSection>

            {/* Avatar Skeleton */}
            <ShowcaseSection
              title="Avatar Skeleton"
              description="Circular placeholder for profile pictures."
              code={`<SkeletonAvatar size="sm" />
<SkeletonAvatar size="md" />
<SkeletonAvatar size="lg" />
<SkeletonAvatar size="xl" />`}
            >
              <div className="flex items-center gap-4">
                <SkeletonAvatar size="sm" />
                <SkeletonAvatar size="md" />
                <SkeletonAvatar size="lg" />
                <SkeletonAvatar size="xl" />
              </div>
            </ShowcaseSection>

            {/* Button Skeleton */}
            <ShowcaseSection
              title="Button Skeleton"
              description="Placeholder for action buttons."
              code={`<SkeletonButton size="sm" />
<SkeletonButton size="md" />
<SkeletonButton size="lg" />`}
            >
              <div className="flex items-center gap-4">
                <SkeletonButton size="sm" />
                <SkeletonButton size="md" />
                <SkeletonButton size="lg" />
              </div>
            </ShowcaseSection>

            {/* Badge Skeleton */}
            <ShowcaseSection
              title="Badge Skeleton"
              description="Placeholder for status badges and tags."
              code={`<SkeletonBadge />
<SkeletonBadge className="w-20" />
<SkeletonBadge className="w-24" />`}
            >
              <div className="flex items-center gap-2">
                <SkeletonBadge />
                <SkeletonBadge className="w-20" />
                <SkeletonBadge className="w-24" />
              </div>
            </ShowcaseSection>

            {/* Image Skeleton */}
            <ShowcaseSection
              title="Image Skeleton"
              description="Placeholder for images with different aspect ratios."
              code={`<SkeletonImage aspectRatio="square" />
<SkeletonImage aspectRatio="video" />
<SkeletonImage aspectRatio="photo" />`}
            >
              <div className="grid grid-cols-3 gap-4">
                <SkeletonImage aspectRatio="square" />
                <SkeletonImage aspectRatio="video" />
                <SkeletonImage aspectRatio="photo" />
              </div>
            </ShowcaseSection>
          </>
        )}

        {/* Card Skeletons Tab */}
        {activeTab === 'cards' && (
          <>
            {/* Job Card Skeleton */}
            <ShowcaseSection
              title="Job Card Skeleton"
              description="Content-shaped skeleton matching JobCard2025 layout."
              code={`<JobCardSkeleton />
<JobCardSkeleton showImage={false} />`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <JobCardSkeleton />
                <JobCardSkeleton showImage={false} />
              </div>
            </ShowcaseSection>

            {/* Contractor Card Skeleton */}
            <ShowcaseSection
              title="Contractor Card Skeleton"
              description="Skeleton for contractor profile cards with portfolio."
              code={`<ContractorCardSkeleton />
<ContractorCardSkeleton showPortfolio={true} />`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ContractorCardSkeleton />
                <ContractorCardSkeleton showPortfolio={true} />
              </div>
            </ShowcaseSection>

            {/* Message List Skeleton */}
            <ShowcaseSection
              title="Message List Skeleton"
              description="Skeleton for conversation lists and message threads."
              code={`<MessageListSkeleton count={5} />`}
            >
              <MessageListSkeleton count={5} />
            </ShowcaseSection>
          </>
        )}

        {/* Complex Layouts Tab */}
        {activeTab === 'complex' && (
          <>
            {/* Dashboard Skeleton */}
            <ShowcaseSection
              title="Dashboard Skeleton"
              description="Complete dashboard layout with KPIs, charts, and tables."
              code={`<DashboardSkeleton />
<DashboardSkeleton showChart={false} tableRows={3} />`}
            >
              <DashboardSkeleton kpiCount={4} tableRows={3} />
            </ShowcaseSection>

            {/* Form Skeleton */}
            <ShowcaseSection
              title="Form Skeleton"
              description="Skeleton for form layouts with various field types."
              code={`<FormSkeleton fields={4} />
<FormSkeleton fields={6} columns={2} />`}
            >
              <FormSkeleton fields={4} />
            </ShowcaseSection>

            {/* Table Skeleton */}
            <ShowcaseSection
              title="Table Skeleton"
              description="Data table skeleton with customizable rows and columns."
              code={`<TableSkeleton rows={5} columns={5} />
<TableSkeleton rows={3} showPagination={false} />`}
            >
              <TableSkeleton rows={3} columns={4} />
            </ShowcaseSection>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Implementation Guide
        </h3>
        <p className="text-gray-600 mb-4">
          See <code className="px-2 py-1 bg-gray-200 rounded">SKELETON_LOADER_IMPLEMENTATION.md</code> for
          complete usage instructions and best practices.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://github.com/yourusername/mintenance"
            className="text-ck-blue-600 hover:text-ck-blue-700 font-medium"
          >
            View on GitHub →
          </a>
          <a
            href="/docs/components/skeletons"
            className="text-ck-blue-600 hover:text-ck-blue-700 font-medium"
          >
            Full Documentation →
          </a>
        </div>
      </div>
    </div>
  );
};

interface ShowcaseSectionProps {
  title: string;
  description: string;
  code: string;
  children: React.ReactNode;
}

const ShowcaseSection: React.FC<ShowcaseSectionProps> = ({
  title,
  description,
  code,
  children,
}) => {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <button
            onClick={() => setShowCode(!showCode)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="p-6">{children}</div>

      {/* Code */}
      {showCode && (
        <div className="border-t border-gray-200 bg-gray-900 p-6">
          <pre className="text-sm text-gray-100 overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default SkeletonShowcase;
