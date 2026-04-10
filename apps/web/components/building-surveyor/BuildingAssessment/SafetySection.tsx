'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import type {
  SafetyHazards,
  SafetyHazard,
} from '@/lib/services/building-surveyor/types';

/**
 * Safety Hazards Card Component
 */
export function SafetyHazardsCard({
  safetyHazards,
}: {
  safetyHazards: SafetyHazards;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card
      variant='default'
      padding='md'
      className='border-l-4 border-l-red-500'
    >
      <div className='space-y-4'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <Icon name='alert' size={24} color='#EF4444' />
            <div>
              <h3 className='text-lg font-[560] text-gray-900'>
                Safety Hazards
              </h3>
              <p className='text-sm font-[460] text-gray-600'>
                {safetyHazards.hazards.length} hazard
                {safetyHazards.hazards.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className='text-gray-500 hover:text-gray-700'
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={20} />
          </button>
        </div>

        <div className='text-sm font-[460] text-gray-700'>
          Safety Score:{' '}
          <span className='font-[560]'>
            {safetyHazards.overallSafetyScore}/100
          </span>
        </div>

        {expanded && (
          <div className='space-y-3 pt-2'>
            {safetyHazards.hazards.map(
              (hazard: SafetyHazard, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    hazard.severity === 'critical' || hazard.severity === 'high'
                      ? 'bg-red-50 border-red-200'
                      : hazard.severity === 'medium'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className='flex items-start justify-between mb-2'>
                    <div className='font-[560] text-gray-900'>
                      {hazard.type.replace(/_/g, ' ')}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-[560] uppercase ${
                        hazard.severity === 'critical' ||
                        hazard.severity === 'high'
                          ? 'bg-red-200 text-red-800'
                          : hazard.severity === 'medium'
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-yellow-200 text-yellow-800'
                      }`}
                    >
                      {hazard.severity}
                    </span>
                  </div>
                  <p className='text-sm font-[460] text-gray-700 mb-1'>
                    {hazard.description}
                  </p>
                  {hazard.immediateAction && (
                    <div className='mt-2 p-2 bg-white rounded border border-red-300'>
                      <div className='text-xs font-[560] text-red-800 mb-1'>
                        Immediate Action:
                      </div>
                      <div className='text-sm font-[460] text-red-700'>
                        {hazard.immediateAction}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
