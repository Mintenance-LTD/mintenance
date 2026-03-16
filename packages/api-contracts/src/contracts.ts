/**
 * Contract API contracts.
 */
import { z } from 'zod';

// ── Request schemas ────────────────────────────────────────────────

export const createContractRequestSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  title: z.string().min(1, 'Title required').max(255, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  amount: z.number().positive('Amount must be positive'),
  start_date: z.string().datetime('Invalid start date format').optional(),
  end_date: z.string().datetime('Invalid end date format').optional(),
  terms: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  contractor_company_name: z.string().min(1, 'Company name required').max(255, 'Company name too long'),
  contractor_license_registration: z.string().min(1, 'License registration required').max(100, 'License registration too long'),
  contractor_license_type: z.string().max(100, 'License type too long').optional(),
  insurance_provider: z.string().max(255, 'Insurance provider too long').optional(),
  insurance_policy_number: z.string().max(100, 'Insurance policy number too long').optional(),
});

export const updateContractRequestSchema = z.object({
  title: z.string().min(1, 'Title required').max(255, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  start_date: z.string().datetime('Invalid start date format').optional(),
  end_date: z.string().datetime('Invalid end date format').optional(),
  terms: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

// ── Response schemas ───────────────────────────────────────────────

export const contractResponseSchema = z.object({
  contract: z.object({
    id: z.string().uuid(),
    job_id: z.string().uuid(),
    homeowner_id: z.string().uuid(),
    contractor_id: z.string().uuid(),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    amount: z.number(),
    status: z.enum(['draft', 'pending_homeowner', 'pending_contractor', 'accepted', 'rejected', 'cancelled']),
    homeowner_signed_at: z.string().optional().nullable(),
    contractor_signed_at: z.string().optional().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }).passthrough(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type CreateContractRequest = z.infer<typeof createContractRequestSchema>;
export type UpdateContractRequest = z.infer<typeof updateContractRequestSchema>;
export type ContractResponse = z.infer<typeof contractResponseSchema>;
