'use client';

import React from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import type { DamageAssessment } from '@/lib/services/building-surveyor/types';

/**
 * Damage Assessment Card Component
 */
export function DamageAssessmentCard({
  damageAssessment,
}: {
  damageAssessment: DamageAssessment;
}) {
  const severityColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    early: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-200',
    },
    midway: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
    },
    full: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
    },
  };

  const colors =
    severityColors[damageAssessment.severity] || severityColors.early;

  return (
    <Card variant='default' padding='md' hover>
      <div className='space-y-4'>
        <div className='flex items-start justify-between'>
          <div>
            <h3 className='text-lg font-[560] text-gray-900 mb-1'>
              Damage Assessment
            </h3>
            <p className='text-sm font-[460] text-gray-600'>
              {damageAssessment.damageType
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border} text-sm font-[560] uppercase`}
          >
            {damageAssessment.severity}
          </div>
        </div>

        <div className='space-y-2'>
          <p className='text-base font-[460] text-gray-700 leading-[1.5]'>
            {damageAssessment.description}
          </p>
          <div className='text-sm font-[460] text-gray-600'>
            Location: {damageAssessment.location.replace(/_/g, ' ')}
          </div>
          <div className='text-sm font-[460] text-gray-600'>
            Confidence: {damageAssessment.confidence}%
          </div>
        </div>

        {damageAssessment.detectedItems.length > 0 && (
          <div className='pt-2 border-t border-gray-200'>
            <div className='text-sm font-[560] text-gray-700 mb-2'>
              Detected Items:
            </div>
            <ul className='space-y-1'>
              {damageAssessment.detectedItems.map(
                (item: string, index: number) => (
                  <li
                    key={index}
                    className='text-sm font-[460] text-gray-600 flex items-start gap-2'
                  >
                    <Icon
                      name='check'
                      size={16}
                      color='#10B981'
                      className='mt-0.5 shrink-0'
                    />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
