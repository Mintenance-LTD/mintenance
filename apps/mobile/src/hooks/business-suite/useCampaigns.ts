/** Marketing Campaigns hook */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contractorBusinessSuite,
  MarketingCampaign,
} from '../../services/contractor-business';
import { logger } from '../../utils/logger';
import { BUSINESS_SUITE_KEYS } from './keys';

export const useMarketingCampaigns = (contractorId: string) => {
  const queryClient = useQueryClient();
  const createCampaign = useMutation({
    mutationFn: async (campaignData: Partial<MarketingCampaign>) => {
      return await contractorBusinessSuite.createMarketingCampaign(
        campaignData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.campaigns(contractorId),
      });
      logger.info('Marketing campaign created successfully');
    },
    onError: (error) => {
      logger.error('Failed to create marketing campaign', error);
    },
  });
  return {
    createCampaign: createCampaign.mutate,
    isCreating: createCampaign.isPending,
    error: createCampaign.error,
  };
};
