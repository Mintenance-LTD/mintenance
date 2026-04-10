'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import type {
  ContractorAdvice as ContractorAdviceType,
  Material,
} from '@/lib/services/building-surveyor/types';

/**
 * Contractor Advice Component (cost estimate + materials + tools + repair steps)
 */
export function ContractorAdviceCard({
  advice,
}: {
  advice: ContractorAdviceType;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant='default' padding='md' className='bg-gray-50'>
      <div className='space-y-4'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <Icon name='briefcase' size={24} color='#1F2937' />
            <div>
              <h3 className='text-lg font-[560] text-gray-900'>
                For Contractors
              </h3>
              <p className='text-sm font-[460] text-gray-600'>
                Technical details and cost estimates
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

        {expanded && (
          <div className='space-y-4 pt-2'>
            {/* Cost Estimate */}
            <div className='p-4 bg-white rounded-lg border border-gray-200'>
              <div className='text-sm font-[560] text-gray-700 mb-2'>
                Cost Estimate
              </div>
              <div className='text-2xl font-[640] text-gray-900'>
                £{advice.estimatedCost.recommended.toLocaleString()}
              </div>
              <div className='text-sm font-[460] text-gray-600 mt-1'>
                Range: £{advice.estimatedCost.min.toLocaleString()} - £
                {advice.estimatedCost.max.toLocaleString()}
              </div>
              <div className='text-sm font-[460] text-gray-600 mt-1'>
                Estimated Time: {advice.estimatedTime}
              </div>
              <div className='text-sm font-[460] text-gray-600'>
                Complexity:{' '}
                <span className='font-[560] capitalize'>
                  {advice.complexity}
                </span>
              </div>
            </div>

            {/* Repair Steps */}
            {advice.repairNeeded.length > 0 && (
              <div>
                <div className='text-sm font-[560] text-gray-700 mb-2'>
                  Repair Steps:
                </div>
                <ol className='space-y-1 list-decimal list-inside'>
                  {advice.repairNeeded.map((step: string, index: number) => (
                    <li
                      key={index}
                      className='text-sm font-[460] text-gray-600'
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Materials */}
            {advice.materials.length > 0 && (
              <div>
                <div className='text-sm font-[560] text-gray-700 mb-2'>
                  Materials Needed:
                </div>
                <div className='space-y-1'>
                  {advice.materials.map((material: Material, index: number) => (
                    <div
                      key={index}
                      className='text-sm font-[460] text-gray-600 flex justify-between'
                    >
                      <span>
                        {material.name} ({material.quantity})
                      </span>
                      <span className='font-[560]'>
                        £{material.estimatedCost}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tools */}
            {advice.tools.length > 0 && (
              <div>
                <div className='text-sm font-[560] text-gray-700 mb-2'>
                  Tools Required:
                </div>
                <div className='flex flex-wrap gap-2'>
                  {advice.tools.map((tool: string, index: number) => (
                    <span
                      key={index}
                      className='px-2 py-1 bg-white border border-gray-200 rounded text-xs font-[460] text-gray-700'
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
