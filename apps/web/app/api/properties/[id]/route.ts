import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      address,
      city,
      postcode,
      type,
      bedrooms,
      bathrooms,
      squareFeet,
      yearBuilt,
      photos,
    } = body;

    // Update the property in the database
    const { data, error } = await serverSupabase
      .from('properties')
      .update({
        property_name: name,
        address,
        city,
        postcode,
        property_type: type,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        square_footage: squareFeet || null,
        year_built: yearBuilt || null,
        photos: photos || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedParams.id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating property:', error);
      return NextResponse.json(
        { error: 'Failed to update property' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Property not found or not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/properties/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the property from the database
    const { error } = await serverSupabase
      .from('properties')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error deleting property:', error);
      return NextResponse.json(
        { error: 'Failed to delete property' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/properties/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}