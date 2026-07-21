/**
 * Contractor Business Suite — finance facade.
 *
 * 2026-06-06: the marketing, client-CRM, analytics and business-dashboard
 * arms of this suite were orphaned dead code — no screen mounted them and
 * they queried ~12 tables that do not exist in the live database. They were
 * deleted. Only the finance path is live (FinanceDashboardScreen via
 * useFinanceDashboard, plus the invoice create/list/detail screens), so this
 * facade is now finance-only.
 */
import { FinancialManagementService } from './FinancialManagementService';

export * from './types';
export { FinancialManagementService } from './FinancialManagementService';

/**
 * Unified Contractor Business Suite Interface (finance only).
 */
export class ContractorBusinessSuite {
  static finance = FinancialManagementService;

  // Instance methods kept for hook compatibility — all delegate to finance.
  async getFinancialSummary(contractorId: string, months?: number) {
    return ContractorBusinessSuite.finance.getFinancialSummary(
      contractorId,
      months
    );
  }

  async createInvoice(invoiceData: Record<string, unknown>) {
    return ContractorBusinessSuite.finance.createInvoice(
      invoiceData as unknown as Parameters<
        typeof ContractorBusinessSuite.finance.createInvoice
      >[0]
    );
  }

  async sendInvoice(invoiceId: string) {
    return ContractorBusinessSuite.finance.sendInvoice(invoiceId, '');
  }

  async recordExpense(expenseData: Record<string, unknown>) {
    return ContractorBusinessSuite.finance.recordExpense(
      expenseData as Parameters<
        typeof ContractorBusinessSuite.finance.recordExpense
      >[0]
    );
  }
}

export const contractorBusinessSuite = new ContractorBusinessSuite();
