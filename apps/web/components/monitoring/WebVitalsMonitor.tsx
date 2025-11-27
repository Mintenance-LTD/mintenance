'use client';

import React from 'react';
import { logger } from '@mintenance/shared';

interface WebVitalsMonitorProps {
  className?: string;
}

export function WebVitalsMonitor({ className = '' }: WebVitalsMonitorProps) {
  React.useEffect(() => {
    // Web vitals monitoring would go here
    logger.info('Web vitals monitoring initialized', { service: 'WebVitalsMonitor' });
  }, []);

  return (
    <div className={`hidden ${className}`}>
      {/* Web vitals monitoring component */}
    </div>
  );
}