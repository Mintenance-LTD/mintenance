/** Schedule and Inventory hooks */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractorBusinessSuite, ResourceInventory } from "../../services/contractor-business";
import type { TimeSlot } from "../../services/contractor-business/ScheduleManagementService";
import { logger } from "../../utils/logger";
import { BUSINESS_SUITE_KEYS } from "./keys";

export const useScheduleManagement = (contractorId: string) => {
  const queryClient = useQueryClient();
  const updateAvailability = useMutation({
    mutationFn: async ({ date, timeSlots }: { date: string; timeSlots: TimeSlot[] }) => {
      return await contractorBusinessSuite.updateScheduleAvailability(contractorId, date, timeSlots);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.schedule(contractorId) });
      logger.info("Schedule updated successfully");
    },
    onError: (error) => { logger.error("Failed to update schedule", error); },
  });
  return { updateAvailability: updateAvailability.mutate, isUpdating: updateAvailability.isPending, error: updateAvailability.error };
};

export const useInventoryManagement = (contractorId: string) => {
  const queryClient = useQueryClient();
  const updateInventory = useMutation({
    mutationFn: async (inventoryUpdates: Partial<ResourceInventory>[]) => {
      return await contractorBusinessSuite.manageInventory(contractorId, inventoryUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.inventory(contractorId) });
      logger.info("Inventory updated successfully");
    },
    onError: (error) => { logger.error("Failed to update inventory", error); },
  });
  return { updateInventory: updateInventory.mutate, isUpdating: updateInventory.isPending, error: updateInventory.error };
};
