/**
 * FinancialManagementService — thin facade over the financial/ subdirectory modules.
 * All implementation lives in financial/*.ts; this file is the public API surface.
 */
import {
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  getInvoices,
  sendInvoice,
  sendInvoiceReminder,
  generateInvoiceNumber,
} from './financial/InvoiceService';
import {
  recordExpense,
  getExpenses,
  getExpenseCategories,
} from './financial/ExpenseService';
import { recordPayment } from './financial/PaymentRecordService';
import {
  calculateFinancialTotals,
  getFinancialSummary,
  calculateDueDate,
} from './financial/FinancialReporter';

export class FinancialManagementService {
  // Invoice
  static createInvoice = createInvoice;
  // 2026-05-23 audit-24 P1: full PATCH for the edit flow (was missing —
  // editing routed back through createInvoice and silently duplicated).
  static updateInvoice = updateInvoice;
  static updateInvoiceStatus = updateInvoiceStatus;
  static getInvoices = getInvoices;
  static sendInvoice = sendInvoice;
  // 2026-05-23 audit-24 P2: re-fires email + invoice_received on an
  // already-sent invoice (status-only PATCH was previously a no-op).
  static sendInvoiceReminder = sendInvoiceReminder;
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
