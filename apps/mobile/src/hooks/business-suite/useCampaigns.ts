/** Marketing Campaigns and Business Goals hooks */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractorBusinessSuite, MarketingCampaign, BusinessGoal } from "../../services/contractor-business";
import { logger } from "../../utils/logger";
import { BUSINESS_SUITE_KEYS } from "./keys";

export const useMarketingCampaigns = (contractorId: string) => {
  const queryClient = useQueryClient();
  const createCampaign = useMutation({
    mutationFn: async (campaignData: Partial<MarketingCampaign>) => {
      return await contractorBusinessSuite.createMarketingCampaign(campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.campaigns(contractorId) });
      logger.info("Marketing campaign created successfully");
    },
    onError: (error) => { logger.error("Failed to create marketing campaign", error); },
  });
  return { createCampaign: createCampaign.mutate, isCreating: createCampaign.isPending, error: createCampaign.error };
};

export const useBusinessGoals = (contractorId: string) => {
  const queryClient = useQueryClient();
  const setGoals = useMutation({
    mutationFn: async (goals: Partial<BusinessGoal>[]) => {
      return await contractorBusinessSuite.setBusinessGoals(contractorId, goals);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.goals(contractorId) });
      logger.info("Business goals updated successfully");
    },
    onError: (error) => { logger.error("Failed to set business goals", error); },
  });
  return { setGoals: setGoals.mutate, isSetting: setGoals.isPending, error: setGoals.error };
};
