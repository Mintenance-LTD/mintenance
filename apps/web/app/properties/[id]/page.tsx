import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import PropertyDetailsClient from './components/PropertyDetailsClient';

interface ContractorProfile {
  first_name: string;
  last_name: string;
}

interface ContractorBid {
  contractor_id: string;
  contractor?: ContractorProfile[];
  status: string;
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Fetch jobs for this homeowner (property_id not in schema yet)
  const { data: jobs, error: jobsError } = await serverSupabase
    .from('jobs')
    .select(`
      id,
      title,
      status,
      budget,
      created_at,
      category,
      contractor_bids:bids (
        contractor_id,
        contractor:profiles!contractor_id (
          first_name,
          last_name
        ),
        status
      )
    `)
    .eq('homeowner_id', user.id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const completedJobs = jobs?.filter(job => job.status === 'completed').length || 0;
  const activeJobs = jobs?.filter(job => job.status === 'in_progress').length || 0;
  const totalSpent = jobs?.reduce((sum, job) => {
    if (job.status === 'completed') {
      return sum + (parseFloat(job.budget) || 0);
    }
    return sum;
  }, 0) || 0;

  // Format property data
  const formattedProperty = {
    id: property.id,
    name: property.property_name || 'My Property',
    address: property.address || '',
    city: property.city || '',
    postcode: property.postcode || '',
    type: property.property_type || 'Residential',
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    squareFeet: property.square_footage || 0,
    yearBuilt: property.year_built || new Date().getFullYear(),
    images: property.photos && property.photos.length > 0 ? property.photos : [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      'https://images.unsplash.com/photo-1565953522043-baea26b83b7e?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800',
      'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800'
    ],
  };

  // Format jobs data
  const formattedJobs = (jobs || []).map(job => {
    // Find an accepted bid if any
    const acceptedBid = (job.contractor_bids as ContractorBid[] | undefined)?.find((bid) => bid.status === 'accepted');
    const contractor = acceptedBid?.contractor ?
      `${acceptedBid.contractor?.[0]?.first_name || ''} ${acceptedBid.contractor?.[0]?.last_name || ''}`.trim() :
      null;

    return {
      id: job.id,
      title: job.title,
      status: job.status,
      contractor,
      amount: parseFloat(job.budget) || 0,
      date: new Date(job.created_at).toLocaleDateString('en-GB'),
      category: job.category || 'General',
    };
  });

  return (
    <PropertyDetailsClient
      property={formattedProperty}
      jobs={formattedJobs}
      stats={{
        completedJobs,
        activeJobs,
        totalSpent,
      }}
    />
  );
}