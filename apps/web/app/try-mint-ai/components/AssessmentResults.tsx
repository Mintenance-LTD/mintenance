'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Gauge,
  TrendingUp,
  AlertCircle,
  Check,
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { AssessmentResult } from './TryMintAIClient';

interface AssessmentResultsProps {
  result: AssessmentResult;
  onAccuracyFeedback: (isAccurate: boolean) => void;
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Severity badge colours mapped to Mint Editorial status tokens.
 * Returns inline-style objects rather than Tailwind classes.
 */
function getSeverityStyle(severity: string): React.CSSProperties {
  switch (severity) {
    case 'Early':
      return {
        color: 'var(--me-ok-fg)',
        background: 'var(--me-ok-bg)',
        borderColor: 'var(--me-ok-fg)',
      };
    case 'Developing':
      return {
        color: 'var(--me-warn-fg)',
        background: 'var(--me-warn-bg)',
        borderColor: 'var(--me-warn-fg)',
      };
    case 'Significant':
      return {
        color: 'var(--me-warn-fg)',
        background: 'var(--me-warn-bg)',
        borderColor: 'var(--me-warn-fg)',
      };
    case 'Dangerous':
      return {
        color: 'var(--me-err-fg)',
        background: 'var(--me-err-bg)',
        borderColor: 'var(--me-err-fg)',
      };
    default:
      return {
        color: 'var(--me-ink-2)',
        background: 'var(--me-bg-2)',
        borderColor: 'var(--me-line)',
      };
  }
}

export function AssessmentResults({
  result,
  onAccuracyFeedback,
}: AssessmentResultsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Early':
        return <CheckCircle2 className='w-5 h-5' aria-hidden='true' />;
      case 'Developing':
        return <AlertCircle className='w-5 h-5' aria-hidden='true' />;
      case 'Significant':
        return <AlertCircle className='w-5 h-5' aria-hidden='true' />;
      case 'Dangerous':
        return <AlertTriangle className='w-5 h-5' aria-hidden='true' />;
      default:
        return <AlertCircle className='w-5 h-5' aria-hidden='true' />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleFeedback = (isAccurate: boolean) => {
    setFeedbackGiven(true);
    onAccuracyFeedback(isAccurate);
  };

  return (
    <section aria-labelledby='results-heading' className='mb-16'>
      <MotionDiv
        variants={fadeIn}
        initial='hidden'
        animate='visible'
        transition={{ duration: 0.5 }}
      >
        {/* Main results card */}
        <div
          className='overflow-hidden'
          style={{
            background: 'var(--me-surface)',
            borderRadius: 'var(--me-radius-card)',
            boxShadow: 'var(--me-shadow-pop)',
            border: '1px solid var(--me-line)',
          }}
        >
          {/* Gradient border effect */}
          <div
            className='h-2'
            style={{
              background:
                'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
            }}
          />

          <div className='p-8 sm:p-12'>
            <h2
              id='results-heading'
              className='text-3xl mb-8 text-center'
              style={{
                color: 'var(--me-ink)',
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Assessment Results
            </h2>

            <div className='space-y-6'>
              {/* Damage type badge */}
              <div>
                <label
                  className='block text-sm font-medium mb-2'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  Damage Type
                </label>
                <div
                  className='inline-flex items-center gap-2 px-4 py-2 font-semibold'
                  style={{
                    background: 'var(--me-brand-soft)',
                    color: 'var(--me-brand)',
                    borderRadius: 'var(--me-radius-input)',
                  }}
                >
                  {result.damageType}
                </div>
              </div>

              {/* Severity indicator */}
              <div>
                <label
                  className='block text-sm font-medium mb-2'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  Severity Level
                </label>
                <div
                  className='inline-flex items-center gap-2 px-4 py-2 font-semibold'
                  style={{
                    borderRadius: 'var(--me-radius-input)',
                    border: '2px solid',
                    ...getSeverityStyle(result.severity),
                  }}
                >
                  {getSeverityIcon(result.severity)}
                  {result.severity}
                </div>
              </div>

              {/* Cost estimate */}
              <div
                className='p-6'
                style={{
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card)',
                  boxShadow: 'var(--me-shadow-card)',
                  border: '1px solid var(--me-line)',
                }}
              >
                <div className='flex items-center gap-2 mb-4'>
                  <TrendingUp
                    className='w-6 h-6'
                    style={{ color: 'var(--me-brand)' }}
                    aria-hidden='true'
                  />
                  <h3
                    className='text-lg font-semibold'
                    style={{ color: 'var(--me-ink)' }}
                  >
                    Estimated Repair Cost
                  </h3>
                </div>
                <div className='flex items-baseline gap-3'>
                  <span
                    className='text-4xl'
                    style={{
                      color: 'var(--me-brand)',
                      fontFamily: 'var(--me-font-display)',
                      fontWeight: 500,
                    }}
                  >
                    {formatCurrency(result.costEstimate.min)}
                  </span>
                  <span
                    className='text-2xl'
                    style={{ color: 'var(--me-ink-3)' }}
                  >
                    -
                  </span>
                  <span
                    className='text-4xl'
                    style={{
                      color: 'var(--me-brand)',
                      fontFamily: 'var(--me-font-display)',
                      fontWeight: 500,
                    }}
                  >
                    {formatCurrency(result.costEstimate.max)}
                  </span>
                </div>
                <p
                  className='text-sm mt-2'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  Based on typical UK property repair costs
                </p>
              </div>

              {/* Confidence score */}
              <div
                className='p-6'
                style={{
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card)',
                  boxShadow: 'var(--me-shadow-card)',
                  border: '1px solid var(--me-line)',
                }}
              >
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <Gauge
                      className='w-5 h-5'
                      style={{ color: 'var(--me-ink-2)' }}
                      aria-hidden='true'
                    />
                    <span
                      className='text-sm font-medium'
                      style={{ color: 'var(--me-ink-2)' }}
                    >
                      AI Confidence
                    </span>
                  </div>
                  <span
                    className='text-2xl font-bold'
                    style={{ color: 'var(--me-ink)' }}
                  >
                    {result.confidence}%
                  </span>
                </div>
                <div
                  className='rounded-full h-3 overflow-hidden'
                  style={{ background: 'var(--me-bg-3)' }}
                >
                  <div
                    className='h-full transition-all duration-500'
                    style={{
                      width: `${result.confidence}%`,
                      background:
                        'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                    }}
                    role='progressbar'
                    aria-valuenow={result.confidence}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Confidence level: ${result.confidence} percent`}
                  />
                </div>
              </div>

              {/* Expandable details */}
              <div
                className='pt-6'
                style={{ borderTop: '1px solid var(--me-line)' }}
              >
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className='flex items-center justify-between w-full text-left focus:outline-none focus:ring-2 rounded p-2'
                  aria-expanded={isExpanded}
                  aria-controls='assessment-details'
                >
                  <span
                    className='text-lg font-semibold'
                    style={{ color: 'var(--me-ink)' }}
                  >
                    Detailed Breakdown
                  </span>
                  {isExpanded ? (
                    <ChevronUp
                      className='w-6 h-6'
                      style={{ color: 'var(--me-ink-2)' }}
                      aria-hidden='true'
                    />
                  ) : (
                    <ChevronDown
                      className='w-6 h-6'
                      style={{ color: 'var(--me-ink-2)' }}
                      aria-hidden='true'
                    />
                  )}
                </button>

                {isExpanded && (
                  <div id='assessment-details' className='mt-4 space-y-4'>
                    <div>
                      <h4
                        className='font-medium mb-2'
                        style={{ color: 'var(--me-ink)' }}
                      >
                        Description
                      </h4>
                      <p style={{ color: 'var(--me-ink-2)' }}>
                        {result.details.description}
                      </p>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <div>
                        <h4
                          className='font-medium mb-2'
                          style={{ color: 'var(--me-ink)' }}
                        >
                          Urgency
                        </h4>
                        <p
                          className='capitalize'
                          style={{ color: 'var(--me-ink-2)' }}
                        >
                          {result.details.urgency}
                        </p>
                      </div>
                      <div>
                        <h4
                          className='font-medium mb-2'
                          style={{ color: 'var(--me-ink)' }}
                        >
                          Safety Risk
                        </h4>
                        <p style={{ color: 'var(--me-ink-2)' }}>
                          {result.details.safetyRisk}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4
                        className='font-medium mb-2'
                        style={{ color: 'var(--me-ink)' }}
                      >
                        Recommendations
                      </h4>
                      <ul
                        className='list-disc list-inside space-y-1'
                        style={{ color: 'var(--me-ink-2)' }}
                      >
                        {result.details.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Materials Section */}
                    {result.details.materials &&
                      result.details.materials.length > 0 && (
                        <div>
                          <h4
                            className='font-medium mb-3 flex items-center gap-2'
                            style={{ color: 'var(--me-ink)' }}
                          >
                            <svg
                              className='w-5 h-5'
                              style={{ color: 'var(--me-brand)' }}
                              fill='none'
                              viewBox='0 0 24 24'
                              stroke='currentColor'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                              />
                            </svg>
                            Materials Needed
                          </h4>
                          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                            {result.details.materials.map((material, idx) => (
                              <div
                                key={idx}
                                className='relative p-3 transition-colors'
                                style={{
                                  background: 'var(--me-bg-2)',
                                  borderRadius: 'var(--me-radius-input)',
                                  border: '1px solid var(--me-line)',
                                }}
                              >
                                {/* Database Badge */}
                                {material.source === 'database' && (
                                  <div
                                    className='absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded inline-flex items-center gap-1'
                                    style={{
                                      background: 'var(--me-brand-soft)',
                                      color: 'var(--me-brand)',
                                    }}
                                  >
                                    <Check size={12} aria-hidden='true' />
                                    DB
                                  </div>
                                )}

                                {/* Material Name */}
                                <div
                                  className='font-medium pr-12 mb-1'
                                  style={{ color: 'var(--me-ink)' }}
                                >
                                  {material.name}
                                </div>

                                {/* Quantity */}
                                <div
                                  className='text-sm mb-2'
                                  style={{ color: 'var(--me-ink-2)' }}
                                >
                                  {material.quantity}
                                </div>

                                {/* Price Information */}
                                {material.source === 'database' &&
                                material.unit_price ? (
                                  <div className='space-y-1'>
                                    <div
                                      className='text-sm'
                                      style={{ color: 'var(--me-ink-2)' }}
                                    >
                                      £{material.unit_price.toFixed(2)}/
                                      {material.unit}
                                    </div>
                                    {material.total_cost && (
                                      <div
                                        className='text-sm font-semibold'
                                        style={{ color: 'var(--me-brand)' }}
                                      >
                                        Total: £{material.total_cost.toFixed(2)}
                                      </div>
                                    )}
                                    {material.supplier_name && (
                                      <div
                                        className='text-xs'
                                        style={{ color: 'var(--me-ink-3)' }}
                                      >
                                        {material.supplier_name}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className='text-sm'
                                    style={{ color: 'var(--me-ink-2)' }}
                                  >
                                    Est. cost: £
                                    {material.estimatedCost.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Total Material Cost */}
                          {result.details.materials.some(
                            (m) => m.total_cost
                          ) && (
                            <div
                              className='mt-3 pt-3'
                              style={{
                                borderTop: '1px solid var(--me-line)',
                              }}
                            >
                              <div className='flex justify-between items-center'>
                                <span
                                  className='font-semibold'
                                  style={{ color: 'var(--me-ink)' }}
                                >
                                  Estimated Material Cost:
                                </span>
                                <span
                                  className='text-lg font-bold'
                                  style={{ color: 'var(--me-brand)' }}
                                >
                                  £
                                  {result.details.materials
                                    .filter((m) => m.total_cost)
                                    .reduce(
                                      (sum, m) => sum + (m.total_cost || 0),
                                      0
                                    )
                                    .toFixed(2)}
                                </span>
                              </div>
                              <p
                                className='text-xs mt-1'
                                style={{ color: 'var(--me-ink-3)' }}
                              >
                                Based on current UK supplier prices
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Accuracy feedback */}
            {!feedbackGiven && (
              <div
                className='mt-8 pt-8'
                style={{ borderTop: '1px solid var(--me-line)' }}
              >
                <p
                  className='text-center font-medium mb-4'
                  style={{ color: 'var(--me-ink)' }}
                >
                  Was this assessment accurate?
                </p>
                <div className='flex justify-center gap-4'>
                  <button
                    onClick={() => handleFeedback(true)}
                    className='inline-flex items-center gap-2 px-6 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors'
                    style={{
                      background: 'var(--me-ok-fg)',
                      color: 'var(--me-on-brand)',
                      borderRadius: 'var(--me-radius-input)',
                    }}
                  >
                    <CheckCircle2 className='w-5 h-5' aria-hidden='true' />
                    Yes, accurate
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className='inline-flex items-center gap-2 px-6 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors'
                    style={{
                      background: 'var(--me-err-fg)',
                      color: 'var(--me-on-brand)',
                      borderRadius: 'var(--me-radius-input)',
                    }}
                  >
                    <XCircle className='w-5 h-5' aria-hidden='true' />
                    No, needs correction
                  </button>
                </div>
              </div>
            )}

            {feedbackGiven && (
              <div
                className='mt-8 pt-8 text-center'
                style={{ borderTop: '1px solid var(--me-line)' }}
              >
                <p className='font-medium' style={{ color: 'var(--me-ok-fg)' }}>
                  Thank you for your feedback!
                </p>
              </div>
            )}
          </div>
        </div>
      </MotionDiv>
    </section>
  );
}
