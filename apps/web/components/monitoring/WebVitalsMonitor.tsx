'use client';

import React from 'react';

interface WebVitalsMonitorProps {
  className?: string;
}

export function WebVitalsMonitor({ className = '' }: WebVitalsMonitorProps) {
  React.useEffect(() => {
    // Web vitals monitoring would go here
    console.log('Web vitals monitoring initialized');
  }, []);

  return (
    <div className={`hidden ${className}`}>
      {/* Web vitals monitoring component */}
    </div>
  );
}