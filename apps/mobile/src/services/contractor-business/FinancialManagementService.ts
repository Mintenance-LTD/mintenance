/**
 * FinancialManagementService — thin facade over the financial/ subdirectory modules.
 * All implementation lives in financial/*.ts; this file is the public API surface.
 */
import { createInvoice, updateInvoiceStatus, getInvoices, sendInvoice, generateInvoiceNumber } from './financial/InvoiceService';
import { recordExpense, getExpenses, getExpenseCategories } from './financial/ExpenseService';
import { recordPayment } from './financial/PaymentRecordService';
import { calculateFinancialTotals, getFinancialSummary, calculateDueDate } from './financial/FinancialReporter';

export class FinancialManagementService {
  // Invoice
  static createInvoice = createInvoice;
  static updateInvoiceStatus = updateInvoiceStatus;
  static getInvoices = getInvoices;
  static sendInvoice = sendInvoice;
  static generateInvoiceNumber = generateInvoiceNumber;

  // Expenses
  static recordExpense = recordExpense;
  static getExpenses = getExpenses;
  static getExpenseCategories = getExpenseCategories;

  // Payments
  static recordPayment = recordPayment;

  // Reports
  static calculateFinancialTotals = calculateFinancialTotals;
  static getFinancialSummary = getFinancialSummary;
  static calculateDueDate = calculateDueDate;
}

export default FinancialManagementService;
