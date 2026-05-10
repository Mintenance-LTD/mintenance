/**
 * ComingSoonPlaceholder — single source of truth for the "feature is
 * coming soon" landing pages we keep around as direct-URL fallbacks
 * (so stale bookmarks land somewhere friendly instead of 404'ing).
 *
 * Audit P2 (2026-05-10): four contractor pages
 * (`/contractor/{connections,resources,social}` plus `/video-calls`)
 * each rolled their own ~50-line placeholder with the same visual
 * structure but slightly different colour swatches and feature lists.
 * Routes are kept noindex via `metadata.robots` and removed from
 * sidebar nav per the 2026-04-23 audit; the visual UI is centralised
 * here so future style changes don't have to be replicated 4 times.
 *
 * Pages stay as thin shells exporting `metadata` (with
 * `robots: { index: false, follow: false }`) and rendering this
 * component with their feature-specific props.
 */

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export interface ComingSoonFeature {
  icon: LucideIcon;
  label: string;
}

interface ComingSoonPlaceholderProps {
  /** Hero icon (rendered at 32px in a 64px tinted square). */
  Icon: LucideIcon;
  /** Tailwind colour name used for the hero square (e.g. 'blue', 'rose'). */
  iconColor: 'blue' | 'purple' | 'rose' | 'teal' | 'amber';
  /** Page title (h1). */
  title: string;
  /** Body description (≤ 2 sentences). */
  description: string;
  /** Up to 3 feature chips shown below the description. */
  features: ComingSoonFeature[];
  /** Override the back-link target. Defaults to /contractor/dashboard-enhanced. */
  backHref?: string;
  /** Override the back-link text. Defaults to 'Back to Dashboard'. */
  backLabel?: string;
}

const colorClasses: Record<
  ComingSoonPlaceholderProps['iconColor'],
  { bg: string; text: string }
> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500' },
};

export function ComingSoonPlaceholder({
  Icon,
  iconColor,
  title,
  description,
  features,
  backHref = '/contractor/dashboard-enhanced',
  backLabel = 'Back to Dashboard',
}: ComingSoonPlaceholderProps): React.ReactElement {
  const colors = colorClasses[iconColor];

  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center px-4 text-center'>
      <div
        className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${colors.bg} ${colors.text}`}
      >
        <Icon className='h-8 w-8' />
      </div>
      <h1 className='text-2xl font-bold text-navy-900'>{title}</h1>
      <p className='mx-auto mt-3 max-w-md text-base text-navy-500'>
        {description}
      </p>

      {features.length > 0 && (
        <div className='mt-8 flex items-center gap-8 text-sm text-navy-400'>
          {features.map(({ icon: FeatureIcon, label }) => (
            <div key={label} className='flex flex-col items-center gap-1'>
              <FeatureIcon className='h-5 w-5' />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className='mt-8 rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-700'>
        Coming soon — this feature is under development.
      </div>
      <Link
        href={backHref}
        className='mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700'
      >
        {backLabel} <ArrowRight className='h-4 w-4' />
      </Link>
    </div>
  );
}
