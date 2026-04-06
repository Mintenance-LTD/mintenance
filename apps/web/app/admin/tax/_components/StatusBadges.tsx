import React from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import type { Form1099Status, W9Status } from './types';

export function getStatusBadge(status: Form1099Status) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Pending
        </span>
      );
    case 'generated':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <FileText className="w-3 h-3" aria-hidden="true" />
          Generated
        </span>
      );
    case 'filed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" aria-hidden="true" />
          Filed
        </span>
      );
  }
}

export function getW9Badge(status: W9Status) {
  switch (status) {
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
          Verified
        </span>
      );
    case 'submitted':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <FileText className="w-3 h-3" aria-hidden="true" />
          Submitted
        </span>
      );
    case 'unverified':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <ShieldAlert className="w-3 h-3" aria-hidden="true" />
          Unverified
        </span>
      );
  }
}
