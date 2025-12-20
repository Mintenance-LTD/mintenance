'use client';

import React, { useEffect, useState, useRef } from 'react';
import { theme } from '@/lib/theme';

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
  formatType?: 'number' | 'currency' | 'percentage';
  currency?: string;
  locale?: string;
}

/**
 * AnimatedCounter Component
 * 
 * Animates a number from 0 to the target value with smooth transitions.
 * Perfect for displaying metrics, statistics, and KPIs.
 * 
 * @example
 * <AnimatedCounter value={15000} prefix="£" duration={1000} />
 * <AnimatedCounter value={42} suffix="%" decimals={1} />
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  style = {},
  formatType = 'number',
  currency = 'GBP',
  locale = 'en-GB',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousValueRef = useRef(value);

  useEffect(() => {
    // Reset animation when value changes
    if (previousValueRef.current !== value) {
      setIsAnimating(true);
      startTimeRef.current = null;
      previousValueRef.current = value;
    }

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const startValue = displayValue;
      const endValue = value;
      const currentValue = startValue + (endValue - startValue) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setIsAnimating(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  const formatValue = (val: number): string => {
    let formatted: string;

    switch (formatType) {
      case 'currency':
        if (prefix) {
          // If prefix is provided, format as number and add prefix manually
          formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals || 2,
            maximumFractionDigits: decimals || 2,
          }).format(val);
        } else {
          // Use currency formatting with symbol
          formatted = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals || 2,
            maximumFractionDigits: decimals || 2,
          }).format(val);
        }
        break;
      case 'percentage':
        formatted = val.toFixed(decimals);
        break;
      case 'number':
      default:
        if (decimals > 0) {
          formatted = val.toFixed(decimals);
        } else {
          formatted = Math.round(val).toLocaleString(locale);
        }
        break;
    }

    // Add prefix and suffix
    const result = `${prefix}${formatted}${suffix}`;
    
    // For percentage, add % if not already in suffix
    if (formatType === 'percentage' && !suffix.includes('%')) {
      return `${result}%`;
    }
    
    return result;
  };

  return (
    <span
      className={`animated-counter ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
        transition: isAnimating ? 'none' : 'opacity 0.2s ease',
        ...style,
      }}
    >
      {formatValue(displayValue)}
    </span>
  );
}

export default AnimatedCounter;

