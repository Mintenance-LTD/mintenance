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

export type JobStage =
  | 'contract_preparing'
  | 'contract_pending'
  | 'awaiting_payment'
  | 'ready_to_start'
  | 'in_progress'
  | 'completed';

export function determineStage(
  jobStatus: string,
  contractStatus: string,
  escrowHeld: boolean
): JobStage {
  if (jobStatus === 'in_progress') return 'in_progress';
  if (jobStatus === 'completed') return 'completed';
  if (jobStatus === 'assigned') {
    if (contractStatus === 'none') return 'contract_preparing';
    if (contractStatus === 'pending') return 'contract_pending';
    if (contractStatus === 'accepted' && !escrowHeld) return 'awaiting_payment';
    if (contractStatus === 'accepted' && escrowHeld) return 'ready_to_start';
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
        title: 'Sign Your Contract',
        subtitle: 'Review the contract terms below and sign to proceed.',
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
          'Upload after photos when complete. This will automatically mark the job as done.',
        accentColor: theme.colors.primary,
        icon: Camera,
      };
    case 'completed':
      return {
        title: 'Awaiting Review',
        subtitle:
          'Your completion photos have been submitted. Payment will be released once the homeowner approves.',
        accentColor: theme.colors.success,
        icon: Award,
      };
  }
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

/**
 * Builds the stepper for the contractor's view of a single job.
 *
 * "Paid" is completed when escrow reaches a terminal state — some
 * release paths flip the row to 'released' while the auto-release
 * path uses 'completed'. Matching on just one label left the stepper
 * stuck at "not paid yet" for auto-released jobs.
 */
export function buildContractorProgressSteps(args: {
  jobStatus: string;
  contractStatus: string;
  currentStage: JobStage;
  escrowHeld: boolean;
  escrowStatus: string;
}): ProgressStep[] {
  const { jobStatus, contractStatus, currentStage, escrowHeld, escrowStatus } =
    args;
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
      label: 'Payment',
      completed: escrowHeld,
      active: currentStage === 'awaiting_payment',
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
      label: 'Paid',
      completed: ['released', 'completed'].includes(escrowStatus),
      active: currentStage === 'completed',
      icon: Award,
    },
  ];
}
