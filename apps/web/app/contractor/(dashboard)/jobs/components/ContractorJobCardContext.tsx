import {
  contractorJobReference,
  contractorVisitWindow,
  pastContractorVisitMessage,
} from '@mintenance/shared';
import type { Job } from '../types';

export function ContractorJobCardContext({ job }: { job: Job }) {
  if (
    !job.contractor_action &&
    !['assigned', 'in_progress', 'completed', 'disputed'].includes(job.status)
  )
    return null;
  const action = job.contractor_action;
  const visit = contractorVisitWindow(
    job.scheduled_start_date,
    job.scheduled_end_date
  );
  return (
    <div className='space-y-1 text-sm'>
      <p className='font-medium text-slate-700'>
        {contractorJobReference(job.id)} ·{' '}
        {visit?.label ?? 'Visit date not set'}
      </p>
      {action && <p className='font-semibold'>{action.label}</p>}
      {job.status === 'assigned' && visit?.passed && (
        <p className='text-amber-900'>
          Visit window passed. {pastContractorVisitMessage(action)}
        </p>
      )}
    </div>
  );
}
