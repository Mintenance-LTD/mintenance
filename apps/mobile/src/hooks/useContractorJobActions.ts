import { useQuery } from '@tanstack/react-query';
import type { ContractorJobAction } from '@mintenance/shared';
import { mobileApiClient } from '../utils/mobileApiClient';
import { queryKeys } from '../lib/queryClient';

export interface ContractorActiveJob {
  id: string;
  title: string;
  scheduled_start_date?: string | null;
  scheduled_end_date?: string | null;
  contractor_action?: ContractorJobAction;
}

export function useContractorJobActions(contractorId?: string) {
  const query = useQuery({
    queryKey: [...queryKeys.jobs.lists(), 'contractor-actions', contractorId],
    enabled: !!contractorId,
    queryFn: async ({ signal }) => {
      const result = await mobileApiClient.get<{ jobs: ContractorActiveJob[] }>(
        '/api/contractor/my-jobs?status=active',
        { signal }
      );
      return Array.isArray(result.jobs) ? result.jobs : [];
    },
  });
  return {
    data: Array.isArray(query.data) ? query.data : undefined,
    refetch: query.refetch,
  };
}
