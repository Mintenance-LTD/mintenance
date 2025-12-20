import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import PropertyEditClient from './components/PropertyEditClient';

export default async function PropertyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login');
  }

  // Fetch property details
  const { data: property, error: propertyError } = await serverSupabase
    .from('properties')
    .select('*')
    .eq('id', resolvedParams.id)
    .eq('owner_id', user.id)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  // Format property data for the client component
  const formattedProperty = {
    id: property.id,
    name: property.property_name || '',
    address: property.address || '',
    city: property.city || '',
    postcode: property.postcode || '',
    type: property.property_type || 'residential',
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    squareFeet: property.square_footage || 0,
    yearBuilt: property.year_built || new Date().getFullYear(),
    photos: property.photos && property.photos.length > 0 ? property.photos : [],
  };

  return <PropertyEditClient property={formattedProperty} />;
}