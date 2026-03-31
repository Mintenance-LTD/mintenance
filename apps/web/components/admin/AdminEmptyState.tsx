'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

interface AdminEmptyStateProps {
  icon: string;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  successIndicator?: boolean;
}

/**
 * Beautiful empty state component matching the Mintenance admin design system.
 * Used across finance, disputes, and escrow pages when no data is available.
 *
 * Patterns from mockups:
 * - Double-ring illustration with icon center
 * - Decorative blur orbs (primary + tertiary)
 * - Success badge overlay when successIndicator=true
 * - Primary + secondary action buttons
 */
export function AdminEmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  successIndicator = false,
}: AdminEmptyStateProps) {
  return (
    <div className='bg-white rounded-[2rem] min-h-[400px] flex flex-col items-center justify-center text-center p-12 relative overflow-hidden'>
      {/* Decorative background orbs */}
      <div className='absolute -top-24 -left-24 w-96 h-96 bg-[#dae2fd]/20 rounded-full blur-[100px]' />
      <div className='absolute -bottom-24 -right-24 w-96 h-96 bg-[#e3dbfd]/20 rounded-full blur-[100px]' />

      <div className='relative z-10 max-w-md space-y-8'>
        {/* Illustration */}
        <div className='relative inline-block mx-auto'>
          <div className='w-48 h-48 bg-[#f0f4f7] rounded-full flex items-center justify-center mx-auto border border-[#a9b4b9]/5'>
            <div className='w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl shadow-slate-200/50'>
              <Icon
                name={icon}
                size={64}
                color='#a9b4b9'
                className='opacity-40'
              />
            </div>
          </div>

          {/* Success indicator badge */}
          {successIndicator && (
            <div className='absolute bottom-0 right-4 bg-white rounded-full p-2 shadow-lg'>
              <Icon name='checkCircle' size={24} color='#10B981' />
            </div>
          )}
        </div>

        {/* Text */}
        <div className='space-y-3'>
          <h3 className='text-2xl font-bold tracking-tight text-[#2a3439]'>
            {title}
          </h3>
          <p className='text-[#566166] text-sm leading-relaxed px-4'>
            {description}
          </p>
        </div>

        {/* Actions */}
        {(primaryAction || secondaryAction) && (
          <div className='flex items-center justify-center gap-4 pt-4'>
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className='px-6 py-2.5 bg-[#e1e9ee] hover:bg-[#d9e4ea] text-[#566166] font-semibold rounded-xl text-sm transition-colors'
              >
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className='px-6 py-2.5 bg-[#565e74] hover:bg-[#4a5268] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#565e74]/20'
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
