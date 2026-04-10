'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import type {
  Compliance,
  ComplianceIssue,
} from '@/lib/services/building-surveyor/types';

/**
 * Compliance Flags Card Component
 */
export function ComplianceFlagsCard({
  compliance,
}: {
  compliance: Compliance;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant='default' padding='md'>
      <div className='space-y-4'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <Icon name='document' size={24} color='#3B82F6' />
            <div>
              <h3 className='text-lg font-[560] text-gray-900'>
                Compliance Flags
              </h3>
              <p className='text-sm font-[460] text-gray-600'>
                {compliance.complianceIssues.length} issue
                {compliance.complianceIssues.length !== 1 ? 's' : ''} detected
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
          Compliance Score:{' '}
          <span className='font-[560]'>{compliance.complianceScore}/100</span>
        </div>

        {compliance.requiresProfessionalInspection && (
          <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
            <div className='text-sm font-[560] text-blue-900'>
              Professional inspection recommended
            </div>
          </div>
        )}

        {expanded && (
          <div className='space-y-3 pt-2'>
            {compliance.complianceIssues.map(
              (issue: ComplianceIssue, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    issue.severity === 'violation'
                      ? 'bg-red-50 border-red-200'
                      : issue.severity === 'warning'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className='flex items-start justify-between mb-2'>
                    <div className='font-[560] text-gray-900'>
                      {issue.issue.replace(/_/g, ' ')}
                    </div>
                    {issue.regulation && (
                      <span className='px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-[560]'>
                        {issue.regulation}
                      </span>
                    )}
                  </div>
                  <p className='text-sm font-[460] text-gray-700 mb-2'>
                    {issue.description}
                  </p>
                  <div className='text-sm font-[460] text-gray-600'>
                    <span className='font-[560]'>Recommendation:</span>{' '}
                    {issue.recommendation}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
