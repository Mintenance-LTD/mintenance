/** Business Metrics hooks */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractorBusinessSuite } from "../../services/contractor-business";
import { logger } from "../../utils/logger";
import { BUSINESS_SUITE_KEYS } from "./keys";

export const useBusinessMetrics = (contractorId: string, periodStart?: string, periodEnd?: string, autoRefresh = false) => {
  const queryClient = useQueryClient();
  const metricsQuery = useQuery({
    queryKey: BUSINESS_SUITE_KEYS.metrics(contractorId, periodStart+"-"+periodEnd),
    queryFn: async () => {
      const start = periodStart || new Date(Date.now() - 30*24*60*60*1000).toISOString();
      const end = periodEnd || new Date().toISOString();
      return await contractorBusinessSuite.calculateBusinessMetrics(contractorId, start, end);
    },
    enabled: Boolean(contractorId),
    staleTime: autoRefresh ? 5*60*1000 : 30*60*1000,
    refetchInterval: autoRefresh ? 5*60*1000 : undefined,
  });
  const refreshMetrics = useMutation({
    mutationFn: async () => {
      const start = periodStart || new Date(Date.now() - 30*24*60*60*1000).toISOString();
      const end = periodEnd || new Date().toISOString();
      return await contractorBusinessSuite.calculateBusinessMetrics(contractorId, start, end);
    },
    onSuccess: (newMetrics) => {
      queryClient.setQueryData(BUSINESS_SUITE_KEYS.metrics(contractorId, periodStart+"-"+periodEnd), newMetrics);
      logger.info("Business metrics refreshed", { contractorId });
    },
    onError: (error) => { logger.error("Failed to refresh business metrics", error); },
  });
  return { metrics: metricsQuery.data, isLoading: metricsQuery.isLoading, error: metricsQuery.error, refetch: metricsQuery.refetch, refresh: refreshMetrics.mutate, isRefreshing: refreshMetrics.isPending };
};

export const useFinancialSummary = (contractorId: string) => {
  return useQuery({
    queryKey: BUSINESS_SUITE_KEYS.financial(contractorId),
    queryFn: async () => await contractorBusinessSuite.getFinancialSummary(contractorId),
    enabled: Boolean(contractorId),
    staleTime: 15*60*1000,
  });
};
