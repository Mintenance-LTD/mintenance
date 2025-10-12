import { NextRequest, NextResponse } from 'next/server';
import type { ContractorProfile } from '@mintenance/types/src/contracts';
import { logger } from '@mintenance/shared';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    if (!id) {
      logger.warn('Contractor ID missing in request', { service: 'contractors' });
      return NextResponse.json({ error: 'Contractor id missing' }, { status: 400 });
    }

    // TODO: Implement actual contractor fetching logic
    const contractor: ContractorProfile | null = null;

    if (!contractor) {
      logger.info('Contractor not found', { service: 'contractors', contractorId: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    logger.info('Contractor retrieved', { service: 'contractors', contractorId: id });
    return NextResponse.json({ contractor });
  } catch (err) {
    logger.error('Failed to load contractor', err, { service: 'contractors' });
    return NextResponse.json({ error: 'Failed to load contractor' }, { status: 500 });
  }
}