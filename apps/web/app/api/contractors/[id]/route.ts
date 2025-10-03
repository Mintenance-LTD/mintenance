import { NextRequest, NextResponse } from 'next/server';
import type { ContractorProfile } from '@mintenance/types/src/contracts';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Contractor id missing' }, { status: 400 });
    }

    const contractor: ContractorProfile | null = null;

    if (!contractor) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ contractor });
  } catch (err) {
    console.error('[API] contractor GET error', err);
    return NextResponse.json({ error: 'Failed to load contractor' }, { status: 500 });
  }
}