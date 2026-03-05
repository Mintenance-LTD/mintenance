/** Client Analytics and CRM hooks */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractorBusinessSuite, ClientCRM } from "../../services/contractor-business";
import { logger } from "../../utils/logger";
import { BUSINESS_SUITE_KEYS } from "./keys";

export const useClientAnalytics = (contractorId: string) => {
  return useQuery({
    queryKey: BUSINESS_SUITE_KEYS.clients(contractorId),
    queryFn: async () => await contractorBusinessSuite.getClientAnalytics(contractorId),
    enabled: Boolean(contractorId),
    staleTime: 30*60*1000,
  });
};

export const useCRMManagement = (contractorId: string) => {
  const queryClient = useQueryClient();
  const updateClient = useMutation({
    mutationFn: async (clientData: Partial<ClientCRM>) => await contractorBusinessSuite.updateClientCRM(clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.clients(contractorId) });
      logger.info("Client CRM updated successfully");
    },
    onError: (error) => { logger.error("Failed to update client CRM", error); },
  });
  return { updateClient: updateClient.mutate, isUpdating: updateClient.isPending, error: updateClient.error };
};
