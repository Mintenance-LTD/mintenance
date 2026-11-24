import {
  contractorJobAction,
  logger,
  type ContractorJobAction,
} from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { collectRows } from '@/lib/db/collect-rows';
import { hasEarlyStartRequest } from '@/lib/services/contracts/early-start';
import { workStartRestriction } from '@/lib/services/contracts/work-start';

// Callers pass jobs already scoped to the authenticated assigned contractor.
export async function loadContractorJobActions(
  contractorId: string,
  jobs: { id: string; status: string | null }[]
): Promise<Map<string, ContractorJobAction>> {
  const actions = new Map<string, ContractorJobAction>();
  const ids = jobs.map((job) => job.id);
  const assigned = jobs
    .filter((job) => job.status === 'assigned')
    .map((job) => job.id);
  if (!ids.length) return actions;

  const [payments, contracts, photos] = await Promise.allSettled([
    collectRows((from, to) =>
      serverSupabase
        .from('escrow_transactions')
        .select('id, job_id, status, admin_hold_status')
        .eq('payee_id', contractorId)
        .in('job_id', ids)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    ),
    assigned.length
      ? collectRows((from, to) =>
          serverSupabase
            .from('contracts')
            .select(
              'id, job_id, status, homeowner_signed_at, cancellation_deadline, cancellation_requested_at'
            )
            .in('job_id', assigned)
            .eq('contractor_id', contractorId)
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to)
        )
      : [],
    assigned.length
      ? collectRows((from, to) =>
          serverSupabase
            .from('job_photos_metadata')
            .select('job_id')
            .in('job_id', assigned)
            .eq('photo_type', 'before')
            .order('id')
            .range(from, to)
        )
      : [],
  ]);
  const availablePayments =
    payments.status === 'fulfilled' ? payments.value : [];
  const availableContracts =
    contracts.status === 'fulfilled' ? contracts.value : [];
  const hasPhoto = new Set(
    photos.status === 'fulfilled' ? photos.value.map((row) => row.job_id) : []
  );
  const incomplete =
    payments.status === 'rejected' ||
    contracts.status === 'rejected' ||
    photos.status === 'rejected';
  const now = Date.now();
  await Promise.all(
    jobs.map(async (job) => {
      const jobPayments = availablePayments.filter(
        (row) => row.job_id === job.id
      );
      const dispute = jobPayments.find((row) => row.status === 'disputed');
      const payment =
        dispute ??
        jobPayments.find((row) => row.status === 'held') ??
        jobPayments[0];
      const contract = availableContracts.find((row) => row.job_id === job.id);
      let unavailable = incomplete;
      let startRestriction: string | null = null;
      if (contract?.status === 'accepted' && payment?.status === 'held') {
        try {
          const earlyStart =
            now < Date.parse(contract.cancellation_deadline ?? '') &&
            (await hasEarlyStartRequest(contract.id));
          startRestriction = workStartRestriction(contract, earlyStart, now);
        } catch {
          unavailable = true;
        }
      }
      const action = contractorJobAction({
        jobStatus: job.status ?? '',
        contractStatus: contract?.status,
        homeownerSigned: !!contract?.homeowner_signed_at,
        paymentStatus: payment?.status,
        paymentHold: payment?.admin_hold_status,
        disputeEscrowId: dispute?.id,
        startRestriction,
        unavailable,
        hasBeforePhoto: hasPhoto.has(job.id),
      });
      if (action) actions.set(job.id, action);
    })
  );
  if (incomplete) {
    logger.warn('Could not load all contractor job requirements', {
      contractorId,
    });
  }
  return actions;
}
