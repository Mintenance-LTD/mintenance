import { NextRequest, NextResponse } from 'next/server';
import type { ContractorProfile } from '@mintenance/types/src/contracts';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    if (!id) {
      logger.warn('Contractor ID missing in request', { service: 'contractors' });
      return NextResponse.json({ error: 'Contractor id missing' }, { status: 400 });
    }

    // Fetch contractor from database
    const { data: contractor, error } = await serverSupabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        bio,
        skills,
        hourly_rate,
        rating,
        review_count,
        profile_image_url,
        verified,
        latitude,
        longitude,
        created_at
      `)
      .eq('id', id)
      .eq('role', 'contractor')
      .single();

    if (error || !contractor) {
      logger.info('Contractor not found', {
        service: 'contractors',
        contractorId: id,
        error: error?.message
      });
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Transform to ContractorProfile format
    const contractorProfile: ContractorProfile = {
      id: contractor.id,
      name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || contractor.email,
      avatarUrl: contractor.profile_image_url,
      rating: contractor.rating,
      reviewCount: contractor.review_count || 0,
      bio: contractor.bio,
    };

    logger.info('Contractor retrieved successfully', {
      service: 'contractors',
      contractorId: id
    });

    return NextResponse.json({ contractor: contractorProfile });
  } catch (err) {
    logger.error('Failed to load contractor', err, { service: 'contractors' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}