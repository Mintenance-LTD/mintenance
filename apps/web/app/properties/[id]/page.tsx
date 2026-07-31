import type { Metadata } from 'next';
import React from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import PropertyDetailsClient from './components/PropertyDetailsClient';
import { MintEditorialPropertyDetail } from './components/MintEditorialPropertyDetail';

export const metadata: Metadata = {
  title: 'Property Details | Mintenance',
  description:
    'View property details, maintenance history, job stats, and manage upkeep for your property.',
};

interface ContractorProfile {
  first_name: string;
  last_name: string;
}

interface ContractorBid {
  contractor_id: string;
  // Supabase returns a many-to-one embed (`contractor:profiles!contractor_id`)
  // as a single OBJECT, not an array. Older code here assumed an array and
  // always read `undefined`. Accept both shapes so the name resolves either
  // way (mirrors the defensive Array.isArray handling in dashboard/page.tsx).
  contractor?: ContractorProfile | ContractorProfile[] | null;
  status: string;
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  // Fetch jobs linked to this specific property
  const { data: jobs, error: jobsError } = await serverSupabase
    .from('jobs')
    .select(
      `
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
    `
    )
    .eq('homeowner_id', user.id)
    .eq('property_id', resolvedParams.id)
    .order('created_at', { ascending: false });

  // Calculate stats. The property grid (/properties) counts any job
  // not yet completed as "active" (posted + assigned + in_progress).
  // The detail page used to only match 'in_progress', so a homeowner
  // with 8 open jobs against a property saw "8 Active Jobs" on the
  // grid and "Active: 0" on the same property's detail page. Aligned.
  const completedJobs =
    jobs?.filter((job) => job.status === 'completed').length || 0;
  const activeJobs =
    jobs?.filter((job) =>
      ['posted', 'assigned', 'in_progress'].includes(job.status || '')
    ).length || 0;
  const totalSpent =
    jobs?.reduce((sum, job) => {
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
    images:
      property.photos && property.photos.length > 0 ? property.photos : [],
    // Access & contacts (migration 20260520000003). These may be
    // undefined on installs where the migration hasn't run — guard
    // with `??` so the picker just starts empty rather than crashing.
    access_mode: (property.access_mode ?? null) as
      | 'key_safe'
      | 'smart_lock'
      | 'in_person'
      | null,
    key_safe_code: property.key_safe_code ?? null,
    access_notes: property.access_notes ?? null,
    stopcock_location: property.stopcock_location ?? null,
    gas_isolator_location: property.gas_isolator_location ?? null,
    consumer_unit_location: property.consumer_unit_location ?? null,
  };

  // Maintenance Plan tab — fetch recurring_schedules for this
  // property. The table + RLS already exist (migration 20260214200000);
  // the row count is just zero for properties that haven't been
  // configured yet, which is a fine empty state.
  const { data: schedulesRows } = await serverSupabase
    .from('recurring_schedules')
    .select(
      'id, task_type, title, description, category, frequency, next_due_date, last_completed_date, auto_create_job, is_active'
    )
    .eq('owner_id', user.id)
    .eq('property_id', property.id)
    .order('next_due_date', { ascending: true });
  const schedules = schedulesRows || [];

  // Format jobs data
  const formattedJobs = (jobs || []).map((job) => {
    // Find an accepted bid if any
    const acceptedBid = (
      job.contractor_bids as ContractorBid[] | undefined
    )?.find((bid) => bid.status === 'accepted');
    // Many-to-one embeds come back as an object; guard for the legacy
    // array shape too so the contractor name resolves regardless of the
    // driver's return shape. Previously this only did array access and
    // always produced an empty string → `job.contractor` was falsy
    // everywhere downstream (Jobs tab, saved trades, timeline).
    const contractorProfile = Array.isArray(acceptedBid?.contractor)
      ? acceptedBid?.contractor[0]
      : acceptedBid?.contractor;
    const contractor = contractorProfile
      ? `${contractorProfile.first_name || ''} ${contractorProfile.last_name || ''}`.trim() ||
        null
      : null;

    return {
      id: job.id,
      title: job.title,
      status: job.status,
      contractor,
      amount: parseFloat(job.budget) || 0,
      // Pass the raw ISO timestamp down. Consumers either format it at
      // render time (Jobs tab, recent-jobs card, CSV export) or parse it
      // with `new Date(...)` (charts, health score, timeline). The old
      // pre-formatted 'dd/mm/yyyy' string re-parsed as Invalid Date
      // (dd > 12) or the wrong US month (dd <= 12) in V8.
      date: job.created_at,
      category: job.category || 'General',
    };
  });

  // Phase-2 design rebrand. Mint Editorial users get the new card
  // layout (real per-property health score from
  // calculatePropertyHealthScore, recent jobs list, single Post-a-job
  // CTA). Spending-trend chart from the legacy view is deliberately
  // omitted in this first slice — building it would need real
  // month-bucketed payment data that the page doesn't fetch today.
  // Skipping a chart that would otherwise be eye-candy beats faking
  // one (Phase-1 dashboard escrow lesson).
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return (
      <MintEditorialPropertyDetail
        property={formattedProperty}
        jobs={formattedJobs}
        stats={{
          completedJobs,
          activeJobs,
          totalSpent,
        }}
        schedules={schedules}
      />
    );
  }

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
