import {
  Award,
  Briefcase,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  LucideIcon,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { theme } from '@/lib/theme';
import type { ContractorPaymentPresentation } from './payment-presentation';

export type JobStage =
  | 'contract_preparing'
  | 'contract_pending'
  | 'awaiting_payment'
  | 'waiting_to_start'
  | 'ready_to_start'
  | 'in_progress'
  | 'completed';

export function determineStage(
  jobStatus: string,
  contractStatus: string,
  escrowHeld: boolean,
  workStartAllowed = false
): JobStage {
  if (jobStatus === 'in_progress') return 'in_progress';
  if (jobStatus === 'completed') return 'completed';
  if (jobStatus === 'assigned') {
    if (contractStatus === 'none') return 'contract_preparing';
    if (contractStatus === 'pending') return 'contract_pending';
    if (contractStatus === 'accepted' && !escrowHeld) return 'awaiting_payment';
    if (contractStatus === 'accepted' && escrowHeld)
      return workStartAllowed ? 'ready_to_start' : 'waiting_to_start';
  }
  return 'contract_preparing';
}

export interface StageConfig {
  title: string;
  subtitle: string;
  accentColor: string;
  icon: LucideIcon;
}

export function getStageConfig(stage: JobStage): StageConfig {
  switch (stage) {
    case 'contract_preparing':
      return {
        title: 'Bid Accepted — Prepare Your Contract',
        subtitle:
          'Create a detailed contract with your business details, schedule, and terms. The homeowner will review and sign it.',
        accentColor: theme.colors.info,
        icon: FileText,
      };
    case 'contract_pending':
      return {
        title: 'Contract signatures pending',
        subtitle:
          'Check the next signer below. The homeowner signs first; the contractor signs after them.',
        accentColor: theme.colors.warning,
        icon: FileText,
      };
    case 'awaiting_payment':
      return {
        title: 'Waiting for Payment',
        subtitle:
          'Both parties have signed. The homeowner needs to deposit payment into escrow before work can begin.',
        accentColor: theme.colors.info,
        icon: Clock,
      };
    case 'waiting_to_start':
      return {
        title: 'Waiting to start',
        subtitle:
          'Payment is secured. Check the cancellation period and contract requirements before work begins.',
        accentColor: theme.colors.warning,
        icon: Clock,
      };
    case 'ready_to_start':
      return {
        title: 'Ready to Start Work',
        subtitle:
          'Payment is secured in escrow. Upload before photos and start the job.',
        accentColor: theme.colors.success,
        icon: Camera,
      };
    case 'in_progress':
      return {
        title: 'Work In Progress',
        subtitle:
          'Upload completion evidence. For requested changes, submit the fresh rework evidence explicitly for review.',
        accentColor: theme.colors.primary,
        icon: Camera,
      };
    case 'completed':
      return {
        title: 'Work completed',
        subtitle: 'The completion evidence is available below.',
        accentColor: theme.colors.success,
        icon: Award,
      };
  }
}

export function contractorStageUsesPaymentMessage(
  stage: JobStage,
  payment: ContractorPaymentPresentation
) {
  return (
    stage === 'completed' ||
    [
      'disputed',
      'on_hold',
      'release_pending',
      'released',
      'refunded',
      'payment_issue',
      'unavailable',
    ].includes(payment.kind)
  );
}

export interface JobStatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

export const JOB_STATUS_CONFIG: Record<string, JobStatusConfig> = {
  posted: { label: 'Posted', color: theme.colors.info, icon: Briefcase },
  assigned: { label: 'Assigned', color: theme.colors.warning, icon: UserCheck },
  in_progress: {
    label: 'In Progress',
    color: theme.colors.primary,
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    color: theme.colors.success,
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: theme.colors.error,
    icon: XCircle,
  },
};

export interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  active: boolean;
  icon: LucideIcon;
}

export function buildContractorProgressSteps(args: {
  jobStatus: string;
  contractStatus: string;
  currentStage: JobStage;
  payment: ContractorPaymentPresentation;
}): ProgressStep[] {
  const { jobStatus, contractStatus, currentStage, payment } = args;
  const releasePaused =
    payment.kind === 'disputed' || payment.kind === 'on_hold';
  return [
    {
      id: 'bid',
      label: 'Bid Accepted',
      completed: true,
      active: false,
      icon: UserCheck,
    },
    {
      id: 'contract',
      label: 'Contract',
      completed: contractStatus === 'accepted',
      active:
        currentStage === 'contract_pending' ||
        currentStage === 'contract_preparing',
      icon: FileText,
    },
    {
      id: 'payment',
      label: 'Funding',
      completed: payment.funded,
      active: currentStage === 'awaiting_payment' && payment.kind === 'pending',
      icon: CreditCard,
    },
    {
      id: 'start',
      label: 'Start Work',
      completed: jobStatus === 'in_progress' || jobStatus === 'completed',
      active: currentStage === 'ready_to_start',
      icon: Camera,
    },
    {
      id: 'complete',
      label: 'Complete',
      completed: jobStatus === 'completed',
      active: currentStage === 'in_progress',
      icon: CheckCircle2,
    },
    {
      id: 'paid',
      label: releasePaused ? 'Release paused' : 'Release',
      completed: payment.kind === 'released',
      active:
        releasePaused ||
        payment.kind === 'release_pending' ||
        (currentStage === 'completed' && payment.kind === 'held'),
      icon: Award,
    },
  ];
}
