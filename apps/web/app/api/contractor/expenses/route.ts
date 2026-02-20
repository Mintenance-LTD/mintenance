import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError, BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

// GET: Fetch all expenses for the contractor
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const { data: expenses, error } = await serverSupabase
      .from('contractor_expenses')
      .select(`
        id, description, category, amount, date, job_id, payment_method,
        receipt_url, tags, is_billable, notes, created_at,
        job:jobs!contractor_expenses_job_id_fkey(id, title)
      `)
      .eq('contractor_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      logger.error('Error fetching expenses', error, { service: 'expenses', userId: user.id });
      throw new InternalServerError('Failed to fetch expenses');
    }

    const mapped = (expenses || []).map((e: Record<string, unknown>) => {
      const job = e.job as Record<string, unknown> | null;
      return {
        id: e.id,
        description: e.description,
        category: e.category,
        amount: Number(e.amount),
        date: e.date,
        jobId: e.job_id,
        jobTitle: job?.title || null,
        paymentMethod: e.payment_method || 'card',
        receiptUrl: e.receipt_url || null,
        tags: e.tags || [],
        isBillable: e.is_billable || false,
        notes: e.notes || null,
        createdAt: e.created_at,
      };
    });

    return NextResponse.json({ expenses: mapped });
  }
);

const createExpenseSchema = z.object({
  description: z.string().min(1).max(500),
  category: z.enum(['materials', 'tools', 'fuel', 'software', 'insurance', 'marketing', 'other']),
  amount: z.number().positive(),
  date: z.string().min(1),
  jobId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isBillable: z.boolean().optional(),
  notes: z.string().optional(),
});

// POST: Create a new expense
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const validation = await validateRequest(request, createExpenseSchema);
    if (validation instanceof NextResponse) return validation;

    const d = validation.data;

    const { data: expense, error } = await serverSupabase
      .from('contractor_expenses')
      .insert({
        contractor_id: user.id,
        description: d.description,
        category: d.category,
        amount: d.amount,
        date: d.date,
        job_id: d.jobId || null,
        payment_method: d.paymentMethod || 'card',
        tags: d.tags || [],
        is_billable: d.isBillable || false,
        notes: d.notes || null,
      })
      .select('id, description, category, amount, date, job_id, payment_method, tags, is_billable, notes, created_at')
      .single();

    if (error) {
      logger.error('Error creating expense', error, { service: 'expenses', userId: user.id });
      throw new InternalServerError('Failed to create expense');
    }

    return NextResponse.json({ expense }, { status: 201 });
  }
);

// DELETE: Remove an expense
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) throw new BadRequestError('Missing expense id');

    // Verify ownership
    const { data: existing } = await serverSupabase
      .from('contractor_expenses')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const { error } = await serverSupabase
      .from('contractor_expenses')
      .delete()
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error deleting expense', error, { service: 'expenses', userId: user.id });
      throw new InternalServerError('Failed to delete expense');
    }

    return NextResponse.json({ success: true });
  }
);

// PATCH: Update an expense
export const PATCH = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) throw new BadRequestError('Missing expense id');

    // Verify ownership
    const { data: existing } = await serverSupabase
      .from('contractor_expenses')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Map camelCase to snake_case
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.jobId !== undefined) dbUpdates.job_id = updates.jobId;
    if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.isBillable !== undefined) dbUpdates.is_billable = updates.isBillable;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await serverSupabase
      .from('contractor_expenses')
      .update(dbUpdates)
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error updating expense', error, { service: 'expenses', userId: user.id });
      throw new InternalServerError('Failed to update expense');
    }

    return NextResponse.json({ success: true });
  }
);
