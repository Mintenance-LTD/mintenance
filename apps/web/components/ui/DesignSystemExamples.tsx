/**
 * Design System Examples
 *
 * Demonstrates usage of the unified design system components.
 * This file serves as both documentation and a visual reference.
 *
 * DO NOT DELETE - Reference documentation for developers
 */

import React from 'react';
import UnifiedButton, { ButtonGroup, IconButton } from './UnifiedButton';
import UnifiedCard, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardGrid,
  StatCard,
  ActionCard,
} from './UnifiedCard';
import StandardHeading, {
  PageTitle,
  SectionHeading,
  SubsectionHeading,
  CardHeading,
  HeadingGroup,
  SupportingText,
} from './StandardHeading';

/**
 * DESIGN TOKENS SUMMARY
 * =====================
 *
 * Colors:
 * - Primary: #0066CC (Professional Blue) - ck-blue-500
 * - Secondary: #10B981 (Warm Orange) - ck-mint-500
 * - Neutral: #F7F9FC (Light Gray) - gray-50
 *
 * Typography:
 * - H1: 32px (text-4xl) - Page titles
 * - H2: 24px (text-2xl) - Section headings
 * - Body: 16px (text-base) - Standard text
 * - Small: 14px (text-sm) - Supporting text
 *
 * Spacing:
 * - Base unit: 4px
 * - Common values: 4, 8, 12, 16, 24, 32, 48, 64px
 *
 * Border Radius:
 * - Buttons: 16px (rounded-lg)
 * - Cards: 20px (rounded-xl)
 *
 * Shadows:
 * - sm: Subtle elevation
 * - md: Moderate elevation
 * - lg: Significant elevation
 */

export const DesignSystemExamples = () => {
  return (
    <div className="p-8 space-y-16 bg-gray-50">
      {/* ========================================
          TYPOGRAPHY EXAMPLES
          ======================================== */}
      <section>
        <PageTitle>Typography Hierarchy</PageTitle>
        <SupportingText className="mt-2 mb-8">
          Consistent heading styles using StandardHeading component
        </SupportingText>

        <div className="space-y-8">
          {/* H1 - Page Title */}
          <div>
            <StandardHeading level={1}>
              H1: Welcome to Mintenance (32px)
            </StandardHeading>
            <code className="text-xs text-gray-600 mt-1 block">
              {'<PageTitle>...</PageTitle>'}
            </code>
          </div>

          {/* H2 - Section Heading */}
          <div>
            <StandardHeading level={2}>
              H2: Recent Jobs Section (24px)
            </StandardHeading>
            <code className="text-xs text-gray-600 mt-1 block">
              {'<SectionHeading>...</SectionHeading>'}
            </code>
          </div>

          {/* H3 - Subsection Heading */}
          <div>
            <StandardHeading level={3}>
              H3: Job Details Subsection (20px)
            </StandardHeading>
            <code className="text-xs text-gray-600 mt-1 block">
              {'<SubsectionHeading>...</SubsectionHeading>'}
            </code>
          </div>

          {/* Heading with Supporting Text */}
          <div>
            <HeadingGroup>
              <SectionHeading>Grouped Heading</SectionHeading>
              <SupportingText>
                This is supporting text that provides additional context.
                Uses gray-600 color and proper spacing.
              </SupportingText>
            </HeadingGroup>
            <code className="text-xs text-gray-600 mt-1 block">
              {'<HeadingGroup><SectionHeading>...</SectionHeading><SupportingText>...</SupportingText></HeadingGroup>'}
            </code>
          </div>

          {/* Color Variants */}
          <div className="space-y-2">
            <StandardHeading level={3} color="default">
              Default Color (gray-900)
            </StandardHeading>
            <StandardHeading level={3} color="primary">
              Primary Color (ck-blue-600)
            </StandardHeading>
            <StandardHeading level={3} color="secondary">
              Secondary Color (ck-mint-600)
            </StandardHeading>
            <StandardHeading level={3} color="muted">
              Muted Color (gray-600)
            </StandardHeading>
          </div>
        </div>
      </section>

      {/* ========================================
          BUTTON EXAMPLES
          ======================================== */}
      <section>
        <SectionHeading>Button Variants</SectionHeading>
        <SupportingText className="mt-2 mb-8">
          Consistent button styles using UnifiedButton component
        </SupportingText>

        <div className="space-y-8">
          {/* Basic Button Variants */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Basic Variants</h4>
            <div className="flex flex-wrap gap-4">
              <UnifiedButton variant="primary">Primary Button</UnifiedButton>
              <UnifiedButton variant="outline">Outline Button</UnifiedButton>
              <UnifiedButton variant="ghost">Ghost Button</UnifiedButton>
              <UnifiedButton variant="secondary">Secondary Button</UnifiedButton>
            </div>
            <code className="text-xs text-gray-600 mt-2 block">
              {'<UnifiedButton variant="primary">...</UnifiedButton>'}
            </code>
          </div>

          {/* Semantic Variants */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Semantic Variants</h4>
            <div className="flex flex-wrap gap-4">
              <UnifiedButton variant="success">Success</UnifiedButton>
              <UnifiedButton variant="danger">Danger</UnifiedButton>
              <UnifiedButton variant="link">Link</UnifiedButton>
            </div>
          </div>

          {/* Button Sizes */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Sizes</h4>
            <div className="flex flex-wrap items-center gap-4">
              <UnifiedButton size="xs">Extra Small</UnifiedButton>
              <UnifiedButton size="sm">Small</UnifiedButton>
              <UnifiedButton size="md">Medium (Default)</UnifiedButton>
              <UnifiedButton size="lg">Large</UnifiedButton>
              <UnifiedButton size="xl">Extra Large</UnifiedButton>
            </div>
            <code className="text-xs text-gray-600 mt-2 block">
              {'<UnifiedButton size="lg">...</UnifiedButton>'}
            </code>
          </div>

          {/* Button States */}
          <div>
            <h4 className="text-lg font-semibold mb-4">States</h4>
            <div className="flex flex-wrap gap-4">
              <UnifiedButton>Normal</UnifiedButton>
              <UnifiedButton loading>Loading</UnifiedButton>
              <UnifiedButton disabled>Disabled</UnifiedButton>
            </div>
            <code className="text-xs text-gray-600 mt-2 block">
              {'<UnifiedButton loading>...</UnifiedButton>'}
            </code>
          </div>

          {/* Button with Icons */}
          <div>
            <h4 className="text-lg font-semibold mb-4">With Icons</h4>
            <div className="flex flex-wrap gap-4">
              <UnifiedButton leftIcon={<span>←</span>}>Back</UnifiedButton>
              <UnifiedButton rightIcon={<span>→</span>}>Next</UnifiedButton>
              <IconButton icon={<span>+</span>} srOnly="Add item" />
            </div>
            <code className="text-xs text-gray-600 mt-2 block">
              {'<UnifiedButton leftIcon={<Icon />}>...</UnifiedButton>'}
            </code>
          </div>

          {/* Button Group */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Button Group</h4>
            <ButtonGroup attached>
              <UnifiedButton variant="outline">Left</UnifiedButton>
              <UnifiedButton variant="outline">Middle</UnifiedButton>
              <UnifiedButton variant="outline">Right</UnifiedButton>
            </ButtonGroup>
            <code className="text-xs text-gray-600 mt-2 block">
              {'<ButtonGroup attached><UnifiedButton>...</UnifiedButton></ButtonGroup>'}
            </code>
          </div>

          {/* Full Width */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Full Width</h4>
            <UnifiedButton fullWidth>Full Width Button</UnifiedButton>
            <code className="text-xs text-gray-600 mt-2 block">
              {'<UnifiedButton fullWidth>...</UnifiedButton>'}
            </code>
          </div>
        </div>
      </section>

      {/* ========================================
          CARD EXAMPLES
          ======================================== */}
      <section>
        <SectionHeading>Card Variants</SectionHeading>
        <SupportingText className="mt-2 mb-8">
          Consistent card styles using UnifiedCard component
        </SupportingText>

        <CardGrid columns={2} gap="md">
          {/* Default Card */}
          <UnifiedCard>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>
                Standard card with border and subtle shadow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                This is the default card variant. It has a subtle border
                and shadow, perfect for most use cases.
              </p>
            </CardContent>
            <CardFooter>
              <UnifiedButton size="sm">Action</UnifiedButton>
            </CardFooter>
          </UnifiedCard>

          {/* Elevated Card */}
          <UnifiedCard variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>
                Floating appearance with larger shadow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Use elevated cards for important content that needs
                to stand out from the background.
              </p>
            </CardContent>
          </UnifiedCard>

          {/* Interactive Card */}
          <UnifiedCard variant="interactive" onClick={() => alert('Card clicked!')}>
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
              <CardDescription>
                Clickable with hover effects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Click anywhere on this card to trigger an action.
                Perfect for navigation or selection.
              </p>
            </CardContent>
          </UnifiedCard>

          {/* Ghost Card */}
          <UnifiedCard variant="ghost">
            <CardHeader>
              <CardTitle>Ghost Card</CardTitle>
              <CardDescription>
                Minimal style with no border
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Ghost cards are great for subtle grouping without
                heavy visual weight.
              </p>
            </CardContent>
          </UnifiedCard>
        </CardGrid>

        {/* Stat Cards */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold mb-4">Stat Cards</h4>
          <CardGrid columns={3} gap="md">
            <StatCard
              title="Total Revenue"
              value="$12,345"
              description="This month"
              trend={{ value: 12.5, label: "vs last month", direction: "up" }}
              icon={<span className="text-2xl">💰</span>}
            />
            <StatCard
              title="Active Jobs"
              value="24"
              description="In progress"
              icon={<span className="text-2xl">🔨</span>}
            />
            <StatCard
              title="Customer Rating"
              value="4.8"
              description="Average rating"
              trend={{ value: 3.2, label: "improvement", direction: "up" }}
              icon={<span className="text-2xl">⭐</span>}
            />
          </CardGrid>
        </div>

        {/* Action Card */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold mb-4">Action Card</h4>
          <ActionCard
            title="Get Started"
            description="Create your first job posting and start connecting with contractors"
            action={{
              label: "Create Job",
              onClick: () => alert('Create job clicked!'),
            }}
            icon={<span className="text-2xl">🚀</span>}
          />
        </div>
      </section>

      {/* ========================================
          DESIGN TOKEN REFERENCE
          ======================================== */}
      <section>
        <SectionHeading>Design Token Reference</SectionHeading>
        <SupportingText className="mt-2 mb-8">
          Quick reference for design token values
        </SupportingText>

        <UnifiedCard>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Colors */}
              <div>
                <h4 className="font-semibold mb-3">Colors</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-ck-blue-500"></div>
                    <span>Primary: #0066CC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-ck-mint-500"></div>
                    <span>Secondary: #10B981</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-50 border"></div>
                    <span>Neutral: #F7F9FC</span>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div>
                <h4 className="font-semibold mb-3">Typography</h4>
                <div className="space-y-2 text-sm">
                  <div>H1: 32px (text-4xl)</div>
                  <div>H2: 24px (text-2xl)</div>
                  <div>H3: 20px (text-xl)</div>
                  <div>Body: 16px (text-base)</div>
                  <div>Small: 14px (text-sm)</div>
                </div>
              </div>

              {/* Spacing */}
              <div>
                <h4 className="font-semibold mb-3">Spacing</h4>
                <div className="space-y-2 text-sm">
                  <div>Base unit: 4px</div>
                  <div>sm: 8px (2)</div>
                  <div>md: 16px (4)</div>
                  <div>lg: 24px (6)</div>
                  <div>xl: 32px (8)</div>
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <h4 className="font-semibold mb-3">Border Radius</h4>
                <div className="space-y-2 text-sm">
                  <div>sm: 4px</div>
                  <div>md: 8px</div>
                  <div>lg: 16px (buttons)</div>
                  <div>xl: 20px (cards)</div>
                  <div>full: 9999px</div>
                </div>
              </div>

              {/* Shadows */}
              <div>
                <h4 className="font-semibold mb-3">Shadows</h4>
                <div className="space-y-2 text-sm">
                  <div>sm: Subtle</div>
                  <div>md: Moderate</div>
                  <div>lg: Significant</div>
                  <div>xl: Heavy</div>
                </div>
              </div>

              {/* Usage */}
              <div>
                <h4 className="font-semibold mb-3">Usage</h4>
                <div className="space-y-2 text-sm">
                  <code className="block">import {'{'} tokens {'}'} from '@/lib/design-tokens';</code>
                  <code className="block">tokens.colors.primary[500]</code>
                  <code className="block">tokens.spacing[4]</code>
                  <code className="block">tokens.typography.fontSize.base</code>
                </div>
              </div>
            </div>
          </CardContent>
        </UnifiedCard>
      </section>
    </div>
  );
};

export default DesignSystemExamples;
