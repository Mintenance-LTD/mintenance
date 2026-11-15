import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getPropertyForManagement } from '@/lib/services/property-team/property-management-access';
import { validateRequest } from '@/lib/validation/validator';
import { applicabilitySchema } from './schema';

export const PUT = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (request, { user, params }) => {
    await getPropertyForManagement(user, params.id, 'manage_compliance');
    const validation = await validateRequest(request, applicabilitySchema);
    if ('headers' in validation) return validation;
    const { error } = await serverSupabase
      .from('property_compliance_applicability')
      .upsert(
        {
          ...validation.data,
          property_id: params.id,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id,cert_type' }
      );
    if (error) throw new Error('Unable to save applicability. Please retry.');
    return NextResponse.json(
      { saved: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
);
