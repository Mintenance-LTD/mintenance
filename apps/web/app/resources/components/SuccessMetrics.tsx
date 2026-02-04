'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { useInView } from 'framer-motion';
import { TrendingUp, Clock, Star, Award } from 'lucide-react';

/**
 * Animated counter hook for success metrics
 */
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, duration]);

  return count;
}

/**
 * Individual animated stat component
 */
function AnimatedStat({
  icon: Icon,
  value,
  suffix,
  label,
  description,
}: {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  description: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hasAnimated, setHasAnimated] = useState(false);
  const count = useCountUp(hasAnimated ? value : 0, 2000);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  return (
    <MotionDiv
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-105"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="bg-gradient-to-br from-teal-100 to-emerald-100 p-4 rounded-xl">
          <Icon className="w-8 h-8 text-teal-600" aria-hidden="true" />
        </div>
      </div>
      <p className="text-5xl font-bold text-gray-900 mb-2">
        {count}
        {suffix}
      </p>
      <p className="text-lg font-semibold text-gray-700 mb-2">{label}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </MotionDiv>
  );
}

/**
 * Success metrics section
 * Shows key statistics with animated counters
 */
export function SuccessMetrics() {
  const metrics = [
    {
      icon: TrendingUp,
      value: 40,
      suffix: '%',
      label: 'Higher Earnings',
      description: 'Professional contractors who follow our best practices earn 40% more on average',
    },
    {
      icon: Clock,
      value: 60,
      suffix: '%',
      label: 'Faster Response Wins',
      description: 'Response time under 2 hours increases your chance of winning jobs by 60%',
    },
    {
      icon: Star,
      value: 45,
      suffix: '%',
      label: 'Complete Profile Boost',
      description: 'Contractors with complete profiles receive 45% more job offers',
    },
    {
      icon: Award,
      value: 95,
      suffix: '%',
      label: 'Success Rate',
      description: 'Contractors who use our resources report 95% satisfaction with their growth',
    },
  ];

  return (
    <section className="bg-gradient-to-br from-teal-50 to-emerald-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Success by the Numbers
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real data from contractors who use our platform and follow our guidance
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <AnimatedStat key={index} {...metric} />
          ))}
        </div>
      </div>
    </section>
  );
}
