/** Invoice and Expense hooks */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractorBusinessSuite } from "../../services/contractor-business";
import { logger } from "../../utils/logger";
import { BUSINESS_SUITE_KEYS } from "./keys";

export const useInvoiceManagement = (contractorId: string) => {
  const queryClient = useQueryClient();
  const createInvoice = useMutation({
    mutationFn: async (invoiceData: { contractor_id: string; job_id?: string; client_id: string; line_items: { description: string; quantity: number; unit_price: number }[]; tax_rate?: number; payment_terms?: string; due_date?: string; notes?: string }) => {
      return await contractorBusinessSuite.createInvoice(invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.invoices(contractorId) });
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.financial(contractorId) });
      logger.info("Invoice created successfully");
    },
    onError: (error) => { logger.error("Failed to create invoice", error); },
  });
  const sendInvoice = useMutation({
    mutationFn: async (invoiceId: string) => await contractorBusinessSuite.sendInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.invoices(contractorId) });
      logger.info("Invoice sent successfully");
    },
    onError: (error) => { logger.error("Failed to send invoice", error); },
  });
  return { createInvoice: createInvoice.mutate, isCreatingInvoice: createInvoice.isPending, sendInvoice: sendInvoice.mutate, isSendingInvoice: sendInvoice.isPending, createError: createInvoice.error, sendError: sendInvoice.error };
};

export const useExpenseTracking = (contractorId: string) => {
  const queryClient = useQueryClient();
  const recordExpense = useMutation({
    mutationFn: async (expenseData: { contractor_id: string; category: string; subcategory?: string; description: string; amount: number; expense_date: string; payment_method: string; receipt_url?: string; tax_deductible?: boolean; business_purpose?: string; mileage?: number }) => {
      return await contractorBusinessSuite.recordExpense(expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.expenses(contractorId) });
      queryClient.invalidateQueries({ queryKey: BUSINESS_SUITE_KEYS.financial(contractorId) });
      logger.info("Expense recorded successfully");
    },
    onError: (error) => { logger.error("Failed to record expense", error); },
  });
  return { recordExpense: recordExpense.mutate, isRecording: recordExpense.isPending, error: recordExpense.error };
};
