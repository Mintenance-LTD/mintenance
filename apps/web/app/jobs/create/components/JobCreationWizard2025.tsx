'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import { fadeIn, slideInFromRight } from '@/lib/animations/variants';
import { ProgressBar } from '@tremor/react';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface JobCreationWizard2025Props {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
}

export function JobCreationWizard2025({
  currentStep,
  totalSteps,
  onStepChange,
  children,
}: JobCreationWizard2025Props) {
  const steps: Step[] = [
    {
      id: 1,
      title: 'Basic Info',
      description: 'Job details',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 2,
      title: 'Photos',
      description: 'Upload images',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 3,
      title: 'Location & Budget',
      description: 'Set details',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 4,
      title: 'Review',
      description: 'Confirm & post',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <MotionDiv
        className="mb-8"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a New Job</h1>
        <p className="text-gray-600">Let's get your project started in a few simple steps</p>
      </MotionDiv>

      {/* Progress Bar */}
      <MotionDiv
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm font-medium text-teal-600">{Math.round(progress)}% Complete</span>
        </div>
        <ProgressBar value={progress} color="teal" className="h-2" />
      </MotionDiv>

      {/* Step Indicators */}
      <MotionDiv
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-teal-600 -z-10 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />

          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isClickable = currentStep >= step.id;

            return (
              <button
                key={step.id}
                onClick={() => isClickable && onStepChange(step.id)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-2 relative ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                {/* Circle */}
                <MotionDiv
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-teal-600 text-white'
                      : isActive
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                  }`}
                  whileHover={isClickable ? { scale: 1.1 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </MotionDiv>

                {/* Label */}
                <div className="text-center hidden sm:block">
                  <div
                    className={`text-sm font-semibold ${
                      isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </MotionDiv>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <MotionDiv
          key={currentStep}
          variants={slideInFromRight}
          initial="initial"
          animate="animate"
          exit="exit"
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
        >
          {children}
        </MotionDiv>
      </AnimatePresence>
    </div>
  );
}
