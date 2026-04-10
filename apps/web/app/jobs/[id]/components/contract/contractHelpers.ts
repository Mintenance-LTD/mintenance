'use client';

import {
  CheckCircle2,
  Clock,
  FileText,
  PenTool,
  AlertCircle,
} from 'lucide-react';

// ── Formatters ────────────────────────────────────────────────────

export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatCurrency = (amount: number) =>
  `£${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Status config ─────────────────────────────────────────────────

export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: typeof CheckCircle2;
}

export const getStatusConfig = (status: string): StatusConfig => {
  const map: Record<string, StatusConfig> = {
    draft: {
      label: 'Draft',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: FileText,
    },
    pending_contractor: {
      label: 'Awaiting Contractor',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Clock,
    },
    pending_homeowner: {
      label: 'Awaiting Your Signature',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: PenTool,
    },
    accepted: {
      label: 'Fully Signed',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: AlertCircle,
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: AlertCircle,
    },
  };
  return (
    map[status] || {
      label: status,
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: FileText,
    }
  );
};

// ── Constants ─────────────────────────────────────────────────────

export const TERMS_HIDDEN_KEYS = [
  'insurance_provider',
  'insurance_policy_number',
  'source',
  'bid_id',
  'created_from',
];
