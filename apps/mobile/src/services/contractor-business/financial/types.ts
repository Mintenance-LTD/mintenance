import type { Invoice, InvoiceLineItem, ExpenseRecord, PaymentRecord } from '../types';

export type { Invoice, InvoiceLineItem, ExpenseRecord, PaymentRecord };

export interface DatabaseInvoiceRow {
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

export interface DatabaseExpenseRow {
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

export interface DatabasePaymentRow {
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

export interface DatabaseInvoiceUpdateData {
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  updated_at: string;
  paid_date?: string;
}
