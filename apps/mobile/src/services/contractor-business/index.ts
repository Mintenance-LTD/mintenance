/**
 * Contractor Business Suite Module Exports
 *
 * Unified interface for contractor business management services.
 * Domain-separated architecture with focused, single-responsibility services.
 */

import { BusinessAnalyticsService } from './BusinessAnalyticsService';
import { FinancialManagementService } from './FinancialManagementService';
import { MarketingManagementService } from '../marketing-management';
import { ClientManagementService } from '../client-management';

import type { Client } from '../client-management/types';
import type { Invoice } from './types';
import type { ClientCRM } from './types';
import type { UpdateClientRequest } from '../client-management/types';
import type {
  CreateCampaignRequest,
  MarketingCampaign,
} from '../marketing-management/types';
export * from './types';
export type { MarketingCampaign } from '../marketing-management/types';

// Export domain services
export { FinancialManagementService } from './FinancialManagementService';
// Singleton instances
const marketingService = new MarketingManagementService();
const clientService = new ClientManagementService();

interface BusinessHealthIssues {
  atRiskClients: Client[];
  overdueInvoices: Invoice[];
}

/**
 * Unified Contractor Business Suite Interface
 */
export class ContractorBusinessSuite {
  static analytics = BusinessAnalyticsService;
  static finance = FinancialManagementService;
  static marketing = marketingService;
  static clients = clientService;

  /**
   * Aggregate business dashboard data.
   */
  static async getBusinessDashboard(
    contractorId: string,
    dateRange?: [string, string]
  ) {
    const startDate =
      dateRange?.[0] ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = dateRange?.[1] || new Date().toISOString();

    const [
      businessMetrics,
      financialSummary,
      clientAnalytics,
      marketingMetrics,
    ] = await Promise.all([
      this.analytics.calculateBusinessMetrics(contractorId, startDate, endDate),
      this.finance.getFinancialSummary(contractorId),
      this.clients.getClientAnalytics(contractorId),
      this.marketing.getMarketingAnalytics(contractorId),
    ]);

    return {
      business: businessMetrics,
      financial: financialSummary,
      clients: clientAnalytics,
      marketing: marketingMetrics,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Business health status — alerts for at-risk clients and overdue invoices.
   */
  static async getBusinessHealth(contractorId: string) {
    const [clientsData, invoices] = await Promise.all([
      this.clients.getClients(contractorId),
      this.finance.getInvoices(contractorId),
    ]);

    const atRiskClients = clientsData.clients.filter(
      (client) =>
        client.lifecycle?.lastJobDate &&
        new Date(client.lifecycle.lastJobDate).getTime() <
          Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    const overdueInvoices = invoices.filter(
      (inv) =>
        inv.status !== 'paid' && new Date(inv.due_date).getTime() < Date.now()
    );

    return {
      alerts: {
        atRiskClients: atRiskClients.length,
        overdueInvoices: overdueInvoices.length,
      },
      overallHealth: this.calculateHealthScore({
        clientRisk: atRiskClients.length,
        financialRisk: overdueInvoices.length,
      }),
      recommendations: this.generateHealthRecommendations({
        atRiskClients,
        overdueInvoices,
      }),
    };
  }

  private static calculateHealthScore(risks: {
    clientRisk: number;
    financialRisk: number;
  }): number {
    let score = 100;
    score -= Math.min(risks.clientRisk * 5, 30);
    score -= Math.min(risks.financialRisk * 3, 25);
    return Math.max(score, 0);
  }

  private static generateHealthRecommendations(
    issues: BusinessHealthIssues
  ): string[] {
    const recommendations: string[] = [];
    if (issues.atRiskClients.length > 0) {
      recommendations.push(
        `Reach out to ${issues.atRiskClients.length} at-risk clients to maintain relationships`
      );
    }
    if (issues.overdueInvoices.length > 0) {
      recommendations.push(
        `Follow up on ${issues.overdueInvoices.length} overdue invoices to improve cash flow`
      );
    }
    return recommendations;
  }

  // Instance methods for hook compatibility
  async calculateBusinessMetrics(
    contractorId: string,
    periodStart: string,
    periodEnd: string
  ) {
    return ContractorBusinessSuite.analytics.calculateBusinessMetrics(
      contractorId,
      periodStart,
      periodEnd
    );
  }

  async getFinancialSummary(contractorId: string) {
    return ContractorBusinessSuite.finance.getFinancialSummary(contractorId);
  }

  async createInvoice(invoiceData: Record<string, unknown>) {
    return ContractorBusinessSuite.finance.createInvoice(
      invoiceData as Parameters<
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

  async getClientAnalytics(contractorId: string) {
    return ContractorBusinessSuite.clients.getClientAnalytics(contractorId);
  }

  async updateClientCRM(clientData: Partial<ClientCRM>) {
    return ContractorBusinessSuite.clients.updateClient(
      clientData as UpdateClientRequest
    );
  }

  async createMarketingCampaign(campaignData: Partial<MarketingCampaign>) {
    return ContractorBusinessSuite.marketing.createCampaign(
      campaignData as CreateCampaignRequest
    );
  }
}

export const contractorBusinessSuite = new ContractorBusinessSuite();
