'use client';

import React from 'react';
import { InvoiceStatus, STATUS_CONFIG } from './types';

// Invoice Status Badge - lighter
export const StatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};
