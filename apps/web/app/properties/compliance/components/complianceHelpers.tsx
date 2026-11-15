/**
 * Compliance dashboard helpers — extracted from
 * `ComplianceDashboardClient.tsx` to keep that file under the
 * 500-line MDC cap. Pure presentation utilities for cert labels,
 * status colours/icons, and overall property compliance badge.
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';

export const CERT_LABELS: Record<string, string> = {
  gas_safety: 'Gas Safety (CP12)',
  eicr: 'EICR',
  epc: 'EPC',
  smoke_alarm: 'Smoke Alarms',
  co_detector: 'CO Detector',
};

export const CERT_DESCRIPTIONS: Record<string, string> = {
  gas_safety: 'Gas safety certificate and recorded expiry',
  eicr: 'Electrical Installation Condition Report; use the expiry recorded by your assessor',
  epc: 'Energy Performance Certificate and recorded expiry',
  smoke_alarm: 'Record smoke alarm checks and your applicability assessment',
  co_detector:
    'Record carbon monoxide detector checks and your applicability assessment',
};

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function statusColor(status: string) {
  switch (status) {
    case 'valid':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'expiring':
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'expired':
      return 'text-red-700 bg-red-50 border-red-200';
    default:
      return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

export function statusIcon(status: string) {
  switch (status) {
    case 'valid':
      return <CheckCircle2 className='w-4 h-4 text-green-600' />;
    case 'expiring':
      return <AlertTriangle className='w-4 h-4 text-amber-600' />;
    case 'expired':
      return <XCircle className='w-4 h-4 text-red-600' />;
    default:
      return <HelpCircle className='w-4 h-4 text-gray-400' />;
  }
}

export function overallBadge(status: string) {
  switch (status) {
    case 'green':
      return {
        label: 'Records up to date',
        className: 'bg-green-100 text-green-800',
      };
    case 'amber':
      return {
        label: 'Review records',
        className: 'bg-amber-100 text-amber-800',
      };
    case 'red':
      return {
        label: 'Expired records',
        className: 'bg-red-100 text-red-800',
      };
    default:
      return { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };
  }
}
