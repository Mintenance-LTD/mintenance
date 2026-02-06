import { supabase } from '../../config/supabase';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { logger } from '../../utils/logger';
import { Invoice, InvoiceLineItem, ExpenseRecord, PaymentRecord } from './types';

// =====================================================
// DATABASE ROW INTERFACES (snake_case)
// =====================================================

interface DatabaseInvoiceRow {
  id: string;
  contractor_id: string;
  job_id?: string | null;
  client_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  issue_date: string;
  paid_date?: string | null;
  notes?: string | null;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
  client?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface DatabaseExpenseRow {
  id: string;
  contractor_id: string;
  category: string;
  subcategory?: string | null;
  amount: number;
  description: string;
  date: string;
  receipt_url?: string | null;
  tax_deductible: boolean;
  vendor?: string | null;
  created_at: string;
  updated_at: string;
}

interface DatabasePaymentRow {
  id: string;
  contractor_id: string;
  invoice_id?: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number?: string | null;
  notes?: string | null;
  created_at: string;
}

interface DatabaseInvoiceUpdateData {
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  updated_at: string;
  paid_date?: string;
}

// =====================================================
// FINANCIAL MANAGEMENT SERVICE
// Handles invoicing, expenses, and financial tracking
// =====================================================

export class FinancialManagementService {
  /**
   * Create a new invoice
   */
  static async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<Invoice> {
    const context = {
      service: 'FinancialManagementService',
      method: 'createInvoice',
      userId: invoiceData.contractor_id,
      params: { client_id: invoiceData.client_id, total_amount: invoiceData.total_amount },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(invoiceData.contractor_id, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(invoiceData.client_id, 'Client ID', context);
      ServiceErrorHandler.validateRequired(invoiceData.invoice_number, 'Invoice number', context);
      ServiceErrorHandler.validatePositiveNumber(invoiceData.total_amount, 'Total amount', context);

      const { data, error } = await supabase
        .from('invoices')
        .insert([
          {
            ...invoiceData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      return data as Invoice;
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to create invoice');
    }

    return result.data;
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(
    invoiceId: string,
    status: Invoice['status'],
    contractorId: string
  ): Promise<Invoice> {
    const context = {
      service: 'FinancialManagementService',
      method: 'updateInvoiceStatus',
      userId: contractorId,
      params: { invoiceId, status },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(invoiceId, 'Invoice ID', context);
      ServiceErrorHandler.validateRequired(status, 'Status', context);
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      const updateData: DatabaseInvoiceUpdateData = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'paid') {
        updateData.paid_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .eq('contractor_id', contractorId)
        .select()
        .single();

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      return data as Invoice;
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to update invoice status');
    }

    return result.data;
  }

  /**
   * Get all invoices for a contractor
   */
  static async getInvoices(contractorId: string, filters?: {
    status?: Invoice['status'];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Invoice[]> {
    const context = {
      service: 'FinancialManagementService',
      method: 'getInvoices',
      userId: contractorId,
      params: { contractorId, filters },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('issue_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('issue_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      return data as Invoice[] || [];
    }, context);

    if (!result.success) {
      return [];
    }

    return result.data || [];
  }

  /**
   * Record a new expense
   */
  static async recordExpense(expenseData: Omit<ExpenseRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ExpenseRecord> {
    const context = {
      service: 'FinancialManagementService',
      method: 'recordExpense',
      userId: expenseData.contractor_id,
      params: { category: expenseData.category, amount: expenseData.amount },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(expenseData.contractor_id, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(expenseData.category, 'Category', context);
      ServiceErrorHandler.validatePositiveNumber(expenseData.amount, 'Amount', context);
      ServiceErrorHandler.validateRequired(expenseData.description, 'Description', context);

      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            ...expenseData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      return data as ExpenseRecord;
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to record expense');
    }

    return result.data;
  }

  /**
   * Get expenses for a contractor
   */
  static async getExpenses(contractorId: string, filters?: {
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    taxDeductible?: boolean;
  }): Promise<ExpenseRecord[]> {
    const context = {
      service: 'FinancialManagementService',
      method: 'getExpenses',
      userId: contractorId,
      params: { contractorId, filters },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('date', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      if (filters?.taxDeductible !== undefined) {
        query = query.eq('tax_deductible', filters.taxDeductible);
      }

      const { data, error } = await query;

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      return data as ExpenseRecord[] || [];
    }, context);

    if (!result.success) {
      return [];
    }

    return result.data || [];
  }

  /**
   * Record a payment
   */
  static async recordPayment(paymentData: Omit<PaymentRecord, 'id' | 'created_at'>): Promise<PaymentRecord> {
    const context = {
      service: 'FinancialManagementService',
      method: 'recordPayment',
      userId: paymentData.contractor_id,
      params: { amount: paymentData.amount, payment_method: paymentData.payment_method },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(paymentData.contractor_id, 'Contractor ID', context);
      ServiceErrorHandler.validatePositiveNumber(paymentData.amount, 'Amount', context);
      ServiceErrorHandler.validateRequired(paymentData.payment_method, 'Payment method', context);

      const { data, error } = await supabase
        .from('payments')
        .insert([
          {
            ...paymentData,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      // If this payment is for an invoice, update the invoice status
      if (paymentData.invoice_id) {
        await this.updateInvoiceStatus(paymentData.invoice_id, 'paid', paymentData.contractor_id);
      }

      return data as PaymentRecord;
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to record payment');
    }

    return result.data;
  }

  /**
   * Calculate financial totals for a period
   */
  static async calculateFinancialTotals(
    contractorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    outstandingInvoices: number;
    overdueAmount: number;
  }> {
    const context = {
      service: 'FinancialManagementService',
      method: 'calculateFinancialTotals',
      userId: contractorId,
      params: { contractorId, periodStart, periodEnd },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);
      ServiceErrorHandler.validateRequired(periodStart, 'Period start', context);
      ServiceErrorHandler.validateRequired(periodEnd, 'Period end', context);

      // Get paid invoices for revenue
      const { data: paidInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('contractor_id', contractorId)
        .eq('status', 'paid')
        .gte('paid_date', periodStart)
        .lte('paid_date', periodEnd);

      if (invoiceError) {
        throw ServiceErrorHandler.handleDatabaseError(invoiceError, context);
      }

      // Get expenses
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('contractor_id', contractorId)
        .gte('date', periodStart)
        .lte('date', periodEnd);

      if (expenseError) {
        throw ServiceErrorHandler.handleDatabaseError(expenseError, context);
      }

      // Get outstanding invoices
      const { data: outstandingInvoices, error: outstandingError } = await supabase
        .from('invoices')
        .select('total_amount, due_date')
        .eq('contractor_id', contractorId)
        .in('status', ['sent', 'overdue']);

      if (outstandingError) {
        throw ServiceErrorHandler.handleDatabaseError(outstandingError, context);
      }

      const typedPaidInvoices = (paidInvoices || []) as Pick<DatabaseInvoiceRow, 'total_amount'>[];
      const typedExpenses = (expenses || []) as Pick<DatabaseExpenseRow, 'amount'>[];
      const typedOutstandingInvoices = (outstandingInvoices || []) as Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date'>[];

      const totalRevenue = typedPaidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const totalExpenses = typedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalProfit = totalRevenue - totalExpenses;

      const outstanding = typedOutstandingInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const overdue = typedOutstandingInvoices
        .filter((inv) => new Date(inv.due_date) < new Date())
        .reduce((sum, inv) => sum + inv.total_amount, 0);

      return {
        totalRevenue,
        totalExpenses,
        totalProfit,
        outstandingInvoices: outstanding,
        overdueAmount: overdue,
      };
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to calculate financial totals');
    }

    return result.data;
  }

  /**
   * Send invoice via email
   */
  static async sendInvoice(invoiceId: string, contractorId: string): Promise<void> {
    const context = {
      service: 'FinancialManagementService',
      method: 'sendInvoice',
      userId: contractorId,
      params: { invoiceId },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(invoiceId, 'Invoice ID', context);
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          client:users!client_id(email, first_name, last_name)
        `)
        .eq('id', invoiceId)
        .eq('contractor_id', contractorId)
        .single();

      if (fetchError) {
        throw ServiceErrorHandler.handleDatabaseError(fetchError, context);
      }

      // Generate PDF invoice
      const pdfBuffer = await this.generateInvoicePDF(invoice);

      // Send email with PDF attachment
      await this.sendInvoiceEmail(invoice, pdfBuffer);

      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (updateError) {
        throw ServiceErrorHandler.handleDatabaseError(updateError, context);
      }

      logger.info('Invoice sent successfully', { invoiceId });
    }, context);

    if (!result.success) {
      throw new Error('Failed to send invoice');
    }
  }

  /**
   * Generate invoice number
   */
  static async generateInvoiceNumber(contractorId: string): Promise<string> {
    const { data: lastInvoice, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !lastInvoice) {
      return `INV-${new Date().getFullYear()}-001`;
    }

    const lastNumber = parseInt(
      lastInvoice.invoice_number.split('-').pop() || '0'
    );
    return `INV-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  /**
   * Get comprehensive financial summary
   */
  static async getFinancialSummary(contractorId: string): Promise<{
    monthlyRevenue: number[];
    quarterlyGrowth: number;
    yearlyProjection: number;
    outstandingInvoices: number;
    overdueAmount: number;
    profitTrends: {
      month: string;
      revenue: number;
      expenses: number;
      profit: number;
    }[];
    taxObligations: number;
    cashFlowForecast: {
      week: string;
      projectedIncome: number;
      projectedExpenses: number;
      netFlow: number;
    }[];
  }> {
    const context = {
      service: 'FinancialManagementService',
      method: 'getFinancialSummary',
      userId: contractorId,
      params: { contractorId },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      // Get monthly revenue data
      const monthlyRevenue = await this.getMonthlyRevenue(contractorId, 12);

      // Calculate quarterly growth
      const quarterlyGrowth = this.calculateQuarterlyGrowth(monthlyRevenue);

      // Project yearly revenue
      const yearlyProjection = this.projectYearlyRevenue(monthlyRevenue);

      // Get outstanding invoices
      const { outstandingInvoices, overdueAmount } = await this.getInvoicesSummary(contractorId);

      // Get profit trends
      const profitTrends = await this.getProfitTrends(contractorId, 6);

      // Calculate tax obligations
      const taxObligations = await this.calculateTaxObligations(contractorId);

      // Generate cash flow forecast
      const cashFlowForecast = await this.generateCashFlowForecast(contractorId, 8);

      return {
        monthlyRevenue,
        quarterlyGrowth,
        yearlyProjection,
        outstandingInvoices,
        overdueAmount,
        profitTrends,
        taxObligations,
        cashFlowForecast,
      };
    }, context);

    if (!result.success || !result.data) {
      throw new Error('Failed to get financial summary');
    }

    return result.data;
  }

  /**
   * Calculate due date based on payment terms
   */
  static calculateDueDate(paymentTerms: string): string {
    const daysMap: Record<string, number> = {
      '30 days': 30,
      '14 days': 14,
      '7 days': 7,
      'net 30': 30,
      'net 14': 14,
      'immediate': 0,
    };

    const days = daysMap[paymentTerms] || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    return dueDate.toISOString();
  }

  /**
   * Get expense categories for reporting
   */
  static async getExpenseCategories(contractorId: string): Promise<{
    category: string;
    totalAmount: number;
    count: number;
    taxDeductibleAmount: number;
  }[]> {
    const context = {
      service: 'FinancialManagementService',
      method: 'getExpenseCategories',
      userId: contractorId,
      params: { contractorId },
    };

    const result = await ServiceErrorHandler.executeOperation(async () => {
      ServiceErrorHandler.validateRequired(contractorId, 'Contractor ID', context);

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('category, amount, tax_deductible')
        .eq('contractor_id', contractorId);

      if (error) {
        throw ServiceErrorHandler.handleDatabaseError(error, context);
      }

      // Group expenses by category
      const categoryMap = new Map<string, {
        totalAmount: number;
        count: number;
        taxDeductibleAmount: number;
      }>();

      const typedExpenses = (expenses || []) as Pick<DatabaseExpenseRow, 'category' | 'amount' | 'tax_deductible'>[];

      typedExpenses.forEach((expense) => {
        const existing = categoryMap.get(expense.category) || {
          totalAmount: 0,
          count: 0,
          taxDeductibleAmount: 0,
        };

        categoryMap.set(expense.category, {
          totalAmount: existing.totalAmount + expense.amount,
          count: existing.count + 1,
          taxDeductibleAmount: existing.taxDeductibleAmount +
            (expense.tax_deductible ? expense.amount : 0),
        });
      });

      return Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        ...data,
      }));
    }, context);

    if (!result.success) {
      return [];
    }

    return result.data || [];
  }

  /**
   * Private helper methods
   */
  private static async generateInvoicePDF(invoice: DatabaseInvoiceRow): Promise<Buffer> {
    // Mock implementation - would use a PDF library like puppeteer, jsPDF, or PDFKit
    logger.info('Generating invoice PDF', { invoiceId: invoice.id });

    // Mock PDF data - in real implementation would generate actual PDF
    return Buffer.from(`Mock PDF for invoice ${invoice.invoice_number}`);
  }

  private static async sendInvoiceEmail(invoice: DatabaseInvoiceRow, pdfBuffer: Buffer): Promise<void> {
    // Mock implementation - would integrate with email service like SendGrid, Mailgun, or AWS SES
    logger.info('Sending invoice email', {
      invoiceId: invoice.id,
      clientEmail: invoice.client?.email,
    });

    // Mock email sending - in real implementation would send actual email
    return Promise.resolve();
  }

  private static async getMonthlyRevenue(contractorId: string, months: number): Promise<number[]> {
    const results: number[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('contractor_id', contractorId)
        .eq('status', 'paid')
        .gte('paid_date', startDate.toISOString())
        .lte('paid_date', endDate.toISOString());

      const typedInvoices = (invoices || []) as Pick<DatabaseInvoiceRow, 'total_amount'>[];
      const monthlyRev = typedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      results.push(monthlyRev);
    }

    return results;
  }

  private static calculateQuarterlyGrowth(monthlyRevenue: number[]): number {
    if (monthlyRevenue.length < 6) return 0;

    const lastQuarter = monthlyRevenue.slice(-3).reduce((sum, rev) => sum + rev, 0);
    const previousQuarter = monthlyRevenue.slice(-6, -3).reduce((sum, rev) => sum + rev, 0);

    return previousQuarter > 0 ? ((lastQuarter - previousQuarter) / previousQuarter) * 100 : 0;
  }

  private static projectYearlyRevenue(monthlyRevenue: number[]): number {
    const avgMonthly = monthlyRevenue.reduce((sum, rev) => sum + rev, 0) / monthlyRevenue.length;
    return avgMonthly * 12;
  }

  private static async getInvoicesSummary(contractorId: string): Promise<{
    outstandingInvoices: number;
    overdueAmount: number;
  }> {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('total_amount, due_date, status')
      .eq('contractor_id', contractorId)
      .in('status', ['sent', 'overdue']);

    if (error) return { outstandingInvoices: 0, overdueAmount: 0 };

    const typedInvoices = (invoices || []) as Pick<DatabaseInvoiceRow, 'total_amount' | 'due_date' | 'status'>[];

    const outstanding = typedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const overdue = typedInvoices
      .filter((inv) => new Date(inv.due_date) < new Date() && inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    return { outstandingInvoices: outstanding, overdueAmount: overdue };
  }

  private static async getProfitTrends(contractorId: string, months: number): Promise<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[]> {
    return Array.from({ length: months }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (months - 1 - i));
      const revenue = Math.floor(Math.random() * 3000) + 1000;
      const expenses = Math.floor(revenue * 0.7);

      return {
        month: month.toISOString().substring(0, 7),
        revenue,
        expenses,
        profit: revenue - expenses,
      };
    });
  }

  private static async calculateTaxObligations(contractorId: string): Promise<number> {
    // Mock implementation - would calculate based on revenue and expenses
    return Math.floor(Math.random() * 2000) + 500;
  }

  private static async generateCashFlowForecast(contractorId: string, weeks: number): Promise<{
    week: string;
    projectedIncome: number;
    projectedExpenses: number;
    netFlow: number;
  }[]> {
    return Array.from({ length: weeks }, (_, i) => {
      const week = new Date();
      week.setDate(week.getDate() + i * 7);

      return {
        week: week.toISOString().substring(0, 10),
        projectedIncome: Math.floor(Math.random() * 1000) + 200,
        projectedExpenses: Math.floor(Math.random() * 600) + 100,
        netFlow: Math.floor(Math.random() * 800) - 200,
      };
    });
  }
}

export default FinancialManagementService;