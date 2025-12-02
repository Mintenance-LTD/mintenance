'use client';

import React from 'react';
import Link from 'next/link';
import { fadeIn } from '@/lib/animations/variants';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { LucideIcon } from 'lucide-react';

interface EmptyStateCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'default' | 'minimal';
}

export function EmptyStateCard({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
}: EmptyStateCardProps) {
  const isMinimal = variant === 'minimal';

  const content = (
    <MotionDiv
      className={`text-center ${isMinimal ? 'py-8' : 'py-12'}`}
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {Icon && (
        <div className={`${isMinimal ? 'w-12 h-12' : 'w-16 h-16'} bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`${isMinimal ? 'w-6 h-6' : 'w-8 h-8'} text-gray-400`} />
        </div>
      )}
      <h3 className={`${isMinimal ? 'text-base' : 'text-lg'} font-semibold text-gray-900 mb-2`}>
        {title}
      </h3>
      <p className={`${isMinimal ? 'text-sm' : 'text-base'} text-gray-600 mb-4 max-w-md mx-auto`}>
        {description}
      </p>
      {actionLabel && (
        <>
          {actionHref ? (
            <Link href={actionHref}>
              <MotionButton
                className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {actionLabel}
              </MotionButton>
            </Link>
          ) : (
            <MotionButton
              onClick={onAction}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-sm hover:shadow-md"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {actionLabel}
            </MotionButton>
          )}
        </>
      )}
    </MotionDiv>
  );

  if (isMinimal) {
    return content;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {content}
    </div>
  );
}
