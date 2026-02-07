import React from 'react';

interface StepConfig {
  id: number;
  label: string;
  shortLabel: string;
}

interface ProgressBarProps {
  currentStep: number;
  steps: readonly StepConfig[];
}

export function ProgressBar({ currentStep, steps }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep >= step.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step.id}
              </div>
              <span
                className={`ml-3 text-sm font-medium hidden sm:inline ${
                  currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                <div
                  className="h-full bg-teal-600 transition-all duration-300"
                  style={{ width: currentStep > step.id ? '100%' : '0%' }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
