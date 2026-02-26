/**
 * Contractor Invoice Validation Schemas
 */
import { z } from 'zod';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitizer';

export const contractorInvoiceLineItemSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description too long')
    .transform((val) => sanitizeText(val, 500)),
  quantity: z.number().positive('Quantity must be positive'),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  amount: z.number().optional(),
});

export const createInvoiceSchema = z.object({
  jobId: z.string().uuid('Invalid job ID').optional(),
  quoteId: z.string().uuid('Invalid quote ID').optional(),
  clientName: z
    .string()
    .min(1, 'Client name is required')
    .max(200, 'Client name too long')
    .transform((val) => sanitizeText(val, 200)),
  clientEmail: z.string().transform((val) => sanitizeEmail(val)),
  clientPhone: z.string().max(20, 'Phone number too long').optional(),
  clientAddress: z
    .string()
    .max(500, 'Address too long')
    .transform((val) => sanitizeText(val, 500))
    .optional(),
  title: z
    .string()
    .min(1, 'Invoice title is required')
    .max(200, 'Title too long')
    .transform((val) => sanitizeText(val, 200)),
  description: z.string().max(2000, 'Description too long').optional(),
  lineItems: z.array(contractorInvoiceLineItemSchema).min(1, 'At least one line item is required'),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%').default(20),
  paymentTerms: z
    .string()
    .max(500, 'Payment terms too long')
    .default('Payment due within 30 days')
    .transform((val) => sanitizeText(val, 500)),
  notes: z.string().max(2000, 'Notes too long').optional(),
  dueDate: z.string().optional(),
  status: z.enum(['draft', 'sent']).default('draft'),
});

export const updateInvoiceSchema = z.object({
  title: z
    .string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .transform((val) => sanitizeText(val, 200))
    .optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  lineItems: z.array(contractorInvoiceLineItemSchema).min(1, 'At least one line item is required').optional(),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%').optional(),
  paymentTerms: z
    .string()
    .max(500, 'Payment terms too long')
    .transform((val) => sanitizeText(val, 500))
    .optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
  dueDate: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']).optional(),
  clientName: z
    .string()
    .min(1, 'Client name is required')
    .max(200, 'Client name too long')
    .transform((val) => sanitizeText(val, 200))
    .optional(),
  clientEmail: z
    .string()
    .transform((val) => sanitizeEmail(val))
    .optional(),
  clientAddress: z
    .string()
    .max(500, 'Address too long')
    .transform((val) => sanitizeText(val, 500))
    .optional(),
});

// Type exports
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
