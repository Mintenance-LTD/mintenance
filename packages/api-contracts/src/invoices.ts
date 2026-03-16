/**
 * Invoice API contracts.
 *
 * NOTE: No sanitization transforms — web layer applies sanitizeText/sanitizeEmail
 * on top of these base schemas.
 */
import { z } from 'zod';

// ── Request schemas ────────────────────────────────────────────────

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  quantity: z.number().positive('Quantity must be positive'),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  amount: z.number().optional(),
});

export const createInvoiceRequestSchema = z.object({
  jobId: z.string().uuid('Invalid job ID').optional(),
  quoteId: z.string().uuid('Invalid quote ID').optional(),
  clientName: z.string().min(1, 'Client name is required').max(200, 'Client name too long'),
  clientEmail: z.string().email('Invalid email format'),
  clientPhone: z.string().max(20, 'Phone number too long').optional(),
  clientAddress: z.string().max(500, 'Address too long').optional(),
  title: z.string().min(1, 'Invoice title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
  taxRate: z.number().min(0).max(100, 'Tax rate cannot exceed 100%').default(20),
  paymentTerms: z.string().max(500, 'Payment terms too long').default('Payment due within 30 days'),
  notes: z.string().max(2000, 'Notes too long').optional(),
  dueDate: z.string().optional(),
  status: z.enum(['draft', 'sent']).default('draft'),
});

export const updateInvoiceRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  paymentTerms: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']).optional(),
  clientName: z.string().min(1).max(200).optional(),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().max(500).optional(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type CreateInvoiceRequest = z.infer<typeof createInvoiceRequestSchema>;
export type UpdateInvoiceRequest = z.infer<typeof updateInvoiceRequestSchema>;
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
