/**
 * Surveyor-report sections for BuildingAssessmentDisplay: RICS condition
 * rating badge, onsite-inspection (abstention) notice, surveyor diagnosis
 * (taxonomy class + probable cause), and specialist referrals.
 *
 * Split out of BuildingAssessmentDisplay.tsx for the 500-line cap.
 */

'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type {
  ContractorAdvice,
  SpecialistReferral,
} from '@/lib/services/building-surveyor/types';
import { formatMoney } from '@/lib/utils/currency';

// RICS condition rating: 1 = green/routine, 2 = amber/repair soon, 3 = red/urgent
const RICS_BADGE: Record<1 | 2 | 3, { label: string; className: string }> = {
  1: { label: 'Condition 1', className: 'bg-green-100 text-green-700' },
  2: { label: 'Condition 2', className: 'bg-amber-100 text-amber-700' },
  3: { label: 'Condition 3', className: 'bg-red-100 text-red-700' },
};

export function RicsConditionBadge({ rating }: { rating?: 1 | 2 | 3 }) {
  if (!rating) return null;
  const badge = RICS_BADGE[rating];
  return (
    <span
      className={`px-3 py-1 text-sm font-medium rounded-full ${badge.className}`}
      title='RICS condition rating: 1 = routine maintenance, 2 = repair needed, 3 = serious/urgent'
    >
      {badge.label}
    </span>
  );
}

export function OnsiteInspectionNotice({
  needsOnsiteInspection,
  reason,
}: {
  needsOnsiteInspection?: boolean;
  reason?: string;
}) {
  if (!needsOnsiteInspection) return null;
  return (
    <div className='px-6 pt-6'>
      <div className='flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4'>
        <Info
          className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5'
          aria-hidden='true'
        />
        <div className='text-sm text-blue-900'>
          <p className='font-semibold mb-1'>
            An onsite inspection is recommended
          </p>
          <p>
            The AI could not diagnose this reliably from the photos alone
            {reason ? `: ${reason}` : '.'} Treat the details below as indicative
            only.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Warns when the AI-detected damageType doesn't match the category the job
 * was posted under — the AI only sees photos, so the confidence score is
 * photo-only and shouldn't be taken at face value.
 */
export function CategoryMismatchNotice({
  show,
  jobCategory,
  damageType,
  confidence,
}: {
  show: boolean;
  jobCategory?: string | null;
  damageType: string;
  confidence: number;
}) {
  if (!show) return null;
  return (
    <div className='px-6 pt-6'>
      <div className='flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4'>
        <AlertTriangle
          className='w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5'
          aria-hidden='true'
        />
        <div className='text-sm text-amber-900'>
          <p className='font-semibold mb-1'>
            Assessment may not match the job you posted
          </p>
          <p>
            You posted this job under{' '}
            <span className='font-medium capitalize'>
              {jobCategory?.replace(/_/g, ' ')}
            </span>
            , but the AI detected{' '}
            <span className='font-medium capitalize'>
              {damageType.replace(/_/g, ' ')}
            </span>{' '}
            in your photos. The {Math.round(confidence)}% confidence reflects
            photo analysis only. Please check the details below and correct the
            category or re-upload photos if the AI picked up the wrong issue.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SurveyorDiagnosis({
  taxonomyClassId,
  probableCause,
}: {
  taxonomyClassId?: string;
  probableCause?: string;
}) {
  if (!taxonomyClassId && !probableCause) return null;
  return (
    <div className='mt-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
      {taxonomyClassId && (
        <div>
          <p className='text-sm text-gray-500 mb-1'>Surveyor Classification</p>
          <p className='font-medium text-gray-900 capitalize'>
            {taxonomyClassId.replace(/_/g, ' ')}
          </p>
        </div>
      )}
      {probableCause && (
        <div>
          <p className='text-sm text-gray-500 mb-1'>Probable Cause</p>
          <p className='text-gray-700 text-sm'>{probableCause}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Cost Estimate. When the AI has abstained (needsOnsiteInspection), a firm
 * price contradicts "cannot assess from photos", so we reframe it as an
 * indicative band with an explicit caveat instead of a confident figure.
 */
export function CostEstimateSection({
  contractorAdvice,
  needsOnsiteInspection,
}: {
  contractorAdvice?: ContractorAdvice;
  needsOnsiteInspection?: boolean;
}) {
  const estimatedCost = contractorAdvice?.estimatedCost;
  return (
    <div className='p-6 border-t border-gray-200'>
      <h4 className='font-medium text-gray-900 mb-4'>
        {needsOnsiteInspection ? 'Indicative Cost' : 'Cost Estimate'}
      </h4>
      <div className='bg-blue-50 rounded-lg p-4'>
        {needsOnsiteInspection ? (
          <>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm text-gray-600'>Likely range</span>
              <span className='text-2xl font-bold text-blue-600'>
                {(estimatedCost?.max ?? 0) > 0
                  ? `${formatMoney(estimatedCost?.min ?? 0)} – ${formatMoney(estimatedCost?.max ?? 0)}`
                  : 'To be confirmed'}
              </span>
            </div>
            <div className='text-xs text-gray-600'>
              Scope and final cost can only be confirmed by an onsite inspection
              — treat this as a rough guide only.
            </div>
          </>
        ) : (
          <>
            <div className='flex items-center justify-between mb-3'>
              <span className='text-sm text-gray-600'>Estimated Cost</span>
              <span className='text-2xl font-bold text-blue-600'>
                {formatMoney(estimatedCost?.recommended ?? 0)}
              </span>
            </div>
            <div className='text-sm text-gray-600'>
              Range: {formatMoney(estimatedCost?.min ?? 0)} –{' '}
              {formatMoney(estimatedCost?.max ?? 0)}
            </div>
          </>
        )}
        {contractorAdvice?.estimatedTime && (
          <div className='text-xs text-gray-500 mt-1'>
            Estimated time: {contractorAdvice.estimatedTime}
          </div>
        )}
      </div>

      {(contractorAdvice?.materials?.length ?? 0) > 0 && (
        <div className='mt-4'>
          <p className='text-sm font-medium text-gray-700 mb-2'>Materials:</p>
          <div className='space-y-1'>
            {contractorAdvice!.materials.map((material, index) => (
              <div
                key={index}
                className='flex items-center justify-between text-sm'
              >
                <span className='text-gray-600'>
                  {material.name} ({material.quantity})
                </span>
                <span className='font-medium'>
                  {formatMoney(material.estimatedCost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SpecialistReferralsSection({
  referrals,
}: {
  referrals?: SpecialistReferral[];
}) {
  if (!referrals?.length) return null;
  return (
    <div className='p-6 border-t border-gray-200'>
      <h4 className='font-medium text-gray-900 mb-3'>Specialist Referrals</h4>
      <div className='space-y-2'>
        {referrals.map((referral, index) => (
          <div key={index} className='flex items-start gap-2'>
            <AlertCircle className='w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0' />
            <p className='text-sm text-gray-700'>
              <strong className='capitalize'>
                {referral.specialistType.replace(/_/g, ' ')}
              </strong>{' '}
              ({referral.urgency}): {referral.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
