import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError, BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

// GET: Fetch all tools for the contractor
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const { data: tools, error } = await serverSupabase
      .from('contractor_tools')
      .select('*')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching tools', error, { service: 'tools', userId: user.id });
      throw new InternalServerError('Failed to fetch tools');
    }

    const mapped = (tools || []).map((t: Record<string, unknown>) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      manufacturer: t.manufacturer || '',
      model: t.model || '',
      serialNumber: t.serial_number || null,
      purchaseDate: t.purchase_date || null,
      purchasePrice: Number(t.purchase_price || 0),
      currentValue: Number(t.current_value || 0),
      condition: t.condition,
      status: t.status,
      location: t.location || '',
      lastMaintenanceDate: t.last_maintenance_date || null,
      nextMaintenanceDate: t.next_maintenance_date || null,
      warrantyExpiry: t.warranty_expiry || null,
      imageUrl: t.image_url || null,
      notes: t.notes || null,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ tools: mapped });
  }
);

const createToolSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['power_tools', 'hand_tools', 'electrical', 'plumbing', 'safety', 'measuring', 'other']),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(100).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  status: z.enum(['available', 'in_use', 'maintenance', 'retired']).optional(),
  location: z.string().max(200).optional(),
  nextMaintenanceDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// POST: Create a new tool
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const validation = await validateRequest(request, createToolSchema);
    if (validation instanceof NextResponse) return validation;

    const d = validation.data;

    const { data: tool, error } = await serverSupabase
      .from('contractor_tools')
      .insert({
        contractor_id: user.id,
        name: d.name,
        category: d.category,
        manufacturer: d.manufacturer || '',
        model: d.model || '',
        serial_number: d.serialNumber || null,
        purchase_date: d.purchaseDate || null,
        purchase_price: d.purchasePrice || 0,
        current_value: d.currentValue ?? d.purchasePrice ?? 0,
        condition: d.condition || 'good',
        status: d.status || 'available',
        location: d.location || '',
        next_maintenance_date: d.nextMaintenanceDate || null,
        notes: d.notes || null,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Error creating tool', error, { service: 'tools', userId: user.id });
      throw new InternalServerError('Failed to create tool');
    }

    return NextResponse.json({ tool }, { status: 201 });
  }
);

// DELETE: Remove a tool
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) throw new BadRequestError('Missing tool id');

    const { data: existing } = await serverSupabase
      .from('contractor_tools')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const { error } = await serverSupabase
      .from('contractor_tools')
      .delete()
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error deleting tool', error, { service: 'tools', userId: user.id });
      throw new InternalServerError('Failed to delete tool');
    }

    return NextResponse.json({ success: true });
  }
);

// PATCH: Update a tool
export const PATCH = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) throw new BadRequestError('Missing tool id');

    const { data: existing } = await serverSupabase
      .from('contractor_tools')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.manufacturer !== undefined) dbUpdates.manufacturer = updates.manufacturer;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.serialNumber !== undefined) dbUpdates.serial_number = updates.serialNumber;
    if (updates.purchaseDate !== undefined) dbUpdates.purchase_date = updates.purchaseDate;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;
    if (updates.condition !== undefined) dbUpdates.condition = updates.condition;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.lastMaintenanceDate !== undefined) dbUpdates.last_maintenance_date = updates.lastMaintenanceDate;
    if (updates.nextMaintenanceDate !== undefined) dbUpdates.next_maintenance_date = updates.nextMaintenanceDate;
    if (updates.warrantyExpiry !== undefined) dbUpdates.warranty_expiry = updates.warrantyExpiry;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await serverSupabase
      .from('contractor_tools')
      .update(dbUpdates)
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error updating tool', error, { service: 'tools', userId: user.id });
      throw new InternalServerError('Failed to update tool');
    }

    return NextResponse.json({ success: true });
  }
);
