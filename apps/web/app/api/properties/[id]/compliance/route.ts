import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

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
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    if (property.owner_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Property Rooms Slice 4 (2026-05-21): include the optional
    // room link + its snapshot name/type so the cert list can show
    // "EICR — Kitchen sub-circuit" without a second query.
    const { data: certs, error } = await serverSupabase
      .from('compliance_certificates')
      .select('*, property_room:property_rooms(id, name, room_type)')
      .eq('property_id', propertyId)
      .order('expiry_date', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch certificates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ certificates: certs || [] });
  }
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
      return NextResponse.json(
        { error: 'Property not found or forbidden' },
        { status: 404 }
      );
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
      // Property Rooms Slice 4 — optional link to a property_rooms
      // row. When present, the cert covers just that room.
      property_room_id: rawPropertyRoomId,
    } = body;

    if (!cert_type) {
      return NextResponse.json(
        { error: 'cert_type is required' },
        { status: 400 }
      );
    }

    // Validate property_room_id (when set) belongs to THIS property.
    // We silently drop ids that don't match — the request stays
    // successful so the form doesn't surface a confusing error if
    // a room was just deleted; the cert is saved with no room link
    // instead.
    let propertyRoomId: string | null = null;
    if (typeof rawPropertyRoomId === 'string' && rawPropertyRoomId) {
      const { data: room } = await serverSupabase
        .from('property_rooms')
        .select('id')
        .eq('id', rawPropertyRoomId)
        .eq('property_id', propertyId)
        .maybeSingle();
      if (room?.id) {
        propertyRoomId = room.id;
      } else {
        logger.warn('compliance: ignoring unknown property_room_id', {
          service: 'compliance',
          userId: user.id,
          propertyId,
          rawPropertyRoomId,
        });
      }
    }

    // Calculate status based on expiry
    let status = 'valid';
    if (expiry_date) {
      const daysLeft = Math.ceil(
        (new Date(expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft <= 0) status = 'expired';
      else if (daysLeft <= 90) status = 'expiring';
    }

    // 2026-05-21 (Slice 4): the previous `.upsert(..., { onConflict:
    // 'property_id,cert_type' })` relied on a UNIQUE constraint that
    // we just dropped (rooms now widen the dedup key). Explicit
    // lookup-then-insert-or-update handles both branches:
    //   - Whole-property cert (property_room_id IS NULL) → unique
    //     on (property_id, cert_type) WHERE property_room_id IS NULL.
    //   - Per-room cert (property_room_id IS NOT NULL) → unique on
    //     (property_id, cert_type, property_room_id) WHERE
    //     property_room_id IS NOT NULL.
    const lookup = serverSupabase
      .from('compliance_certificates')
      .select('id')
      .eq('property_id', propertyId)
      .eq('cert_type', cert_type);
    const { data: existing } = await (propertyRoomId === null
      ? lookup.is('property_room_id', null).maybeSingle()
      : lookup.eq('property_room_id', propertyRoomId).maybeSingle());

    const certPayload = {
      property_id: propertyId,
      owner_id: user.id,
      property_room_id: propertyRoomId,
      cert_type,
      certificate_number: certificate_number || null,
      issued_date: issued_date || null,
      expiry_date: expiry_date || null,
      issuer_name: issuer_name || null,
      issuer_registration: issuer_registration || null,
      document_url: document_url || null,
      notes: notes || null,
      status,
    };

    let cert;
    let err;
    if (existing?.id) {
      const update = await serverSupabase
        .from('compliance_certificates')
        .update(certPayload)
        .eq('id', existing.id)
        .select('*, property_room:property_rooms(id, name, room_type)')
        .single();
      cert = update.data;
      err = update.error;
    } else {
      const insert = await serverSupabase
        .from('compliance_certificates')
        .insert(certPayload)
        .select('*, property_room:property_rooms(id, name, room_type)')
        .single();
      cert = insert.data;
      err = insert.error;
    }

    if (err) {
      logger.error('compliance: save failed', {
        service: 'compliance',
        userId: user.id,
        propertyId,
        error: err.message,
      });
      return NextResponse.json(
        { error: 'Failed to save certificate' },
        { status: 500 }
      );
    }

    return NextResponse.json({ certificate: cert }, { status: 201 });
  }
);
