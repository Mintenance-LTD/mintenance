'use client';

import React from 'react';

interface BudgetDisplayProps {
  amount: number;
  currency?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  className?: string;
}

export function BudgetDisplay({
  amount,
  currency = 'GBP',
  label = 'Budget',
  size = 'md',
  showIcon = false,
  className = '',
}: BudgetDisplayProps) {
  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      GBP: '£',
      USD: '$',
      EUR: '€',
    };
    return symbols[currency] || '$';
  };

  const sizeClasses = {
    sm: {
      amount: 'text-lg',
      label: 'text-xs',
      icon: 'w-4 h-4',
    },
    md: {
      amount: 'text-2xl',
      label: 'text-sm',
      icon: 'w-5 h-5',
    },
    lg: {
      amount: 'text-3xl',
      label: 'text-base',
      icon: 'w-6 h-6',
    },
    xl: {
      amount: 'text-4xl',
      label: 'text-lg',
      icon: 'w-7 h-7',
    },
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showIcon && (
        <div className={`flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center`}>
          <svg
            className={`${sizeClasses[size].icon} text-emerald-600`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}

      <div>
        {label && (
          <div className={`${sizeClasses[size].label} text-gray-600 font-medium mb-1`}>
            {label}
          </div>
        )}
        <div className={`${sizeClasses[size].amount} font-bold text-gray-900`}>
          <span aria-label={`${amount} ${currency}`}>
            {getCurrencySymbol(currency)}
            {formatAmount(amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
