'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useCountUp } from './hooks/use-count-up';

interface AnimatedStatProps {
  end: number;
  label: string;
  prefix?: string;
  suffix?: string;
  subtext?: string;
  icon?: React.ReactNode;
}

/**
 * Animated Stat Counter Component with scroll-triggered animation
 */
export function AnimatedStat({
  end,
  label,
  prefix = '',
  suffix = '',
  subtext,
  icon,
}: AnimatedStatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hasAnimated, setHasAnimated] = useState(false);
  const count = useCountUp(hasAnimated ? end : 0, 2000);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
    >
      <p className="text-sm font-semibold text-gray-600 mb-2">{label}</p>
      <p className="text-5xl font-bold text-gray-900 mb-2">
        {prefix}{count.toLocaleString()}{suffix}
      </p>
      {subtext && (
        <div className="flex items-center text-sm text-teal-600 font-medium">
          {icon || (
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          <span>{subtext}</span>
        </div>
      )}
    </motion.div>
  );
}
