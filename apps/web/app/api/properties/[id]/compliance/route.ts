import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// GET /api/properties/[id]/compliance - List compliance certs for a property
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user, params }) => {
    const propertyId = params.id;

    // Verify property ownership
    const { data: property, error: propError } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.owner_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: certs, error } = await serverSupabase
      .from('compliance_certificates')
      .select('*')
      .eq('property_id', propertyId)
      .order('expiry_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
    }

    return NextResponse.json({ certificates: certs || [] });
  },
);

// POST /api/properties/[id]/compliance - Create or update a compliance cert
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const body = await req.json();

    // Verify ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found or forbidden' }, { status: 404 });
    }

    const {
      cert_type,
      certificate_number,
      issued_date,
      expiry_date,
      issuer_name,
      issuer_registration,
      document_url,
      notes,
    } = body;

    if (!cert_type) {
      return NextResponse.json({ error: 'cert_type is required' }, { status: 400 });
    }

    // Calculate status based on expiry
    let status = 'valid';
    if (expiry_date) {
      const daysLeft = Math.ceil(
        (new Date(expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft <= 0) status = 'expired';
      else if (daysLeft <= 90) status = 'expiring';
    }

    // Upsert (unique on property_id + cert_type)
    const { data: cert, error } = await serverSupabase
      .from('compliance_certificates')
      .upsert(
        {
          property_id: propertyId,
          owner_id: user.id,
          cert_type,
          certificate_number: certificate_number || null,
          issued_date: issued_date || null,
          expiry_date: expiry_date || null,
          issuer_name: issuer_name || null,
          issuer_registration: issuer_registration || null,
          document_url: document_url || null,
          notes: notes || null,
          status,
        },
        { onConflict: 'property_id,cert_type' },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to save certificate' }, { status: 500 });
    }

    return NextResponse.json({ certificate: cert }, { status: 201 });
  },
);
