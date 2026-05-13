import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
import { redirect } from 'next/navigation';
import React from 'react';
import { theme } from '@/lib/theme';
import { MapPin, MessageCircle, ArrowLeft } from 'lucide-react';
import { ContractManagement } from '@/app/jobs/[id]/components/ContractManagement';
import { LocationSharing } from './components/LocationSharing';
import { JobScheduling } from '@/app/jobs/[id]/components/JobScheduling';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { JobPhotoUpload } from './components/JobPhotoUpload';
import { OnMyWayButton } from './components/OnMyWayButton';
import { PrepareContractButton } from './components/PrepareContractButton';
import { BuildingAssessmentDisplay } from '@/app/jobs/[id]/components/BuildingAssessmentDisplay';
import { JobInfoSidebar } from './components/JobInfoSidebar';
import { JobProgressStepper } from './components/JobProgressStepper';
import { MintEditorialJobDetailView } from './components/MintEditorialJobDetailView';
import {
  JOB_STATUS_CONFIG,
  buildContractorProgressSteps,
  determineStage,
  getStageConfig,
} from './stage-helpers';

export const metadata: Metadata = {
  title: 'Job Details | Mintenance',
  description:
    'View and manage your assigned job details, progress, scheduling, and homeowner communication.',
};

export default async function ContractorJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (jobError || !job) {
    redirect('/contractor/jobs');
  }

  if (job.contractor_id !== user.id) {
    redirect(`/contractor/bid/${resolvedParams.id}/details`);
  }

  const { data: homeowner } = job.homeowner_id
    ? await serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, profile_image_url')
        .eq('id', job.homeowner_id)
        .single()
    : { data: null };

  // Fetch property access details when the job is linked to a
  // property. Surfaces "Access details" on the contractor sidebar so
  // the contractor doesn't have to chase the homeowner over chat.
  // Columns added in migration 20260520000003. On installs where the
  // migration hasn't run yet the SELECT errors out (column does not
  // exist) — catch that and fall back to null so the view renders the
  // generic "ask the homeowner in chat" placeholder instead of
  // crashing the whole page.
  let property: Record<string, unknown> | null = null;
  if (job.property_id) {
    const propertyResult = await serverSupabase
      .from('properties')
      .select(
        'id, access_mode, key_safe_code, access_notes, stopcock_location, gas_isolator_location, consumer_unit_location'
      )
      .eq('id', job.property_id)
      .maybeSingle();
    if (!propertyResult.error && propertyResult.data) {
      property = propertyResult.data as Record<string, unknown>;
    }
  }

  const { data: contract } = await serverSupabase
    .from('contracts')
    .select(
      'id, status, contractor_signed_at, homeowner_signed_at, start_date, end_date'
    )
    .eq('job_id', resolvedParams.id)
    .single();

  const contractStatus = !contract
    ? 'none'
    : contract.status === 'accepted' ||
        (contract.contractor_signed_at && contract.homeowner_signed_at)
      ? 'accepted'
      : contract.status === 'draft'
        ? 'none' // Draft contracts are treated as "not prepared yet"
        : 'pending';

  const { data: escrowTransaction } = await serverSupabase
    .from('escrow_transactions')
    .select('id, status')
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const escrowStatus = escrowTransaction?.status || 'none';
  const escrowHeld = ['held', 'release_pending', 'released'].includes(
    escrowStatus
  );

  // Fetch job photos for AI assessment display.
  // Re-sign Job-storage URLs at render time — the bucket is now private
  // (2026-04-17 storage-hardening migration), so legacy public URLs 404
  // and old signed URLs eventually expire.
  const { data: jobAttachments } = await serverSupabase
    .from('job_attachments')
    .select('file_url')
    .eq('job_id', resolvedParams.id)
    .eq('file_type', 'image')
    .order('uploaded_at', { ascending: false });

  const jobPhotoUrls = await resignJobStorageUrls(
    (jobAttachments ?? []).map((a: { file_url: string | null }) => a.file_url)
  );

  // Fetch AI building assessment if one exists
  const { data: buildingAssessment } = await serverSupabase
    .from('building_assessments')
    .select('*')
    .eq('job_id', resolvedParams.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentStage = determineStage(
    job.status || 'posted',
    contractStatus,
    escrowHeld
  );
  const stageConfig = getStageConfig(currentStage);

  const currentStatus =
    JOB_STATUS_CONFIG[job.status || 'posted'] || JOB_STATUS_CONFIG.posted;

  const steps = buildContractorProgressSteps({
    jobStatus: job.status || 'posted',
    contractStatus,
    currentStage,
    escrowHeld,
    escrowStatus,
  });

  const messageHref = homeowner
    ? `/contractor/messages?jobId=${resolvedParams.id}`
    : null;

  // Server-side theme detection — render the Mint Editorial layout
  // when the `mintenance-theme=mint-editorial` cookie is present. The
  // contractor /layout.tsx already branches on the same cookie key to
  // mount MintEditorialContractorShell, so we re-use the same approach
  // here without a client hydration round-trip.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  // Access-info defence-in-depth: only surface the key-safe code to
  // the contractor when the job is at the "ready to start" or "in
  // progress" lifecycle stage. Earlier stages (contract_pending,
  // awaiting_payment) shouldn't see the code — escrow must be funded
  // first. The view also gates the render but masking server-side
  // ensures the code never ships to the client when it shouldn't.
  const canSeeKeySafeCode =
    currentStage === 'ready_to_start' || currentStage === 'in_progress';
  const safeProperty = property
    ? {
        access_mode: (property as Record<string, unknown>).access_mode as
          | 'key_safe'
          | 'smart_lock'
          | 'in_person'
          | null,
        key_safe_code: canSeeKeySafeCode
          ? (((property as Record<string, unknown>).key_safe_code as
              | string
              | null) ?? null)
          : null,
        access_notes:
          ((property as Record<string, unknown>).access_notes as
            | string
            | null) ?? null,
        stopcock_location:
          ((property as Record<string, unknown>).stopcock_location as
            | string
            | null) ?? null,
        gas_isolator_location:
          ((property as Record<string, unknown>).gas_isolator_location as
            | string
            | null) ?? null,
        consumer_unit_location:
          ((property as Record<string, unknown>).consumer_unit_location as
            | string
            | null) ?? null,
      }
    : null;

  if (isMintEditorial) {
    return (
      <MintEditorialJobDetailView
        job={{
          id: job.id,
          title: job.title ?? null,
          description: job.description ?? null,
          status: job.status ?? null,
          budget: job.budget ?? null,
          location: job.location ?? null,
          latitude: job.latitude ?? null,
          longitude: job.longitude ?? null,
          created_at: job.created_at ?? null,
          scheduled_start_date: job.scheduled_start_date ?? null,
          scheduled_end_date: job.scheduled_end_date ?? null,
          scheduled_duration_hours: job.scheduled_duration_hours ?? null,
        }}
        homeowner={homeowner}
        contract={
          contract
            ? {
                start_date: contract.start_date ?? null,
                end_date: contract.end_date ?? null,
              }
            : null
        }
        property={safeProperty}
        contractStatus={contractStatus}
        currentStage={currentStage}
        stageTitle={stageConfig.title}
        stageSubtitle={stageConfig.subtitle}
        steps={steps.map((s) => ({
          label: s.label,
          state: s.completed
            ? ('complete' as const)
            : s.active
              ? ('current' as const)
              : ('pending' as const),
        }))}
        escrowHeld={escrowHeld}
        escrowStatus={escrowStatus}
        jobPhotoUrls={jobPhotoUrls}
        buildingAssessment={buildingAssessment}
        userId={user.id}
        messageHref={messageHref}
      />
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>
      {/* Back Navigation */}
      <div style={{ marginBottom: theme.spacing[4] }}>
        <Link
          href='/contractor/jobs'
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textSecondary,
            textDecoration: 'none',
            padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
            borderRadius: theme.borderRadius.lg,
          }}
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Jobs
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: theme.spacing[6] }}>
        <h1
          style={{
            margin: 0,
            marginBottom: theme.spacing[3],
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            letterSpacing: '-0.02em',
          }}
        >
          {job.title || 'Untitled Job'}
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: currentStatus.color + '20',
              color: currentStatus.color,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              border: `1px solid ${currentStatus.color}30`,
            }}
          >
            {React.createElement(currentStatus.icon, {
              className: 'h-4 w-4',
              style: { color: currentStatus.color },
            })}
            {currentStatus.label}
          </span>
          {job.location && (
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <MapPin
                className='h-4 w-4'
                style={{ color: theme.colors.textSecondary }}
              />
              {job.location}
            </p>
          )}
        </div>
      </div>

      {/* ═══ ZONE 2: PRIMARY ACTION CARD ═══ */}
      {job.status !== 'cancelled' && (
        <Card
          padding='lg'
          hover={false}
          style={{
            borderLeft: `4px solid ${stageConfig.accentColor}`,
            marginBottom: theme.spacing[6],
            background: `linear-gradient(135deg, ${stageConfig.accentColor}06 0%, transparent 100%)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[4],
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: `${stageConfig.accentColor}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {React.createElement(stageConfig.icon, {
                className: 'h-5 w-5',
                style: { color: stageConfig.accentColor },
              })}
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                }}
              >
                {stageConfig.title}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginTop: theme.spacing[1],
                }}
              >
                {stageConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Stage-specific primary content */}
          {currentStage === 'contract_pending' && (
            <ContractManagement
              jobId={resolvedParams.id}
              userRole='contractor'
              userId={user.id}
            />
          )}

          {(currentStage === 'ready_to_start' ||
            currentStage === 'in_progress' ||
            currentStage === 'completed') && (
            <JobPhotoUpload
              jobId={resolvedParams.id}
              jobStatus={job.status || 'posted'}
              latitude={job.latitude}
              longitude={job.longitude}
              location={job.location}
            />
          )}

          {currentStage === 'contract_preparing' && (
            <div
              style={{
                marginTop: theme.spacing[2],
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[2],
              }}
            >
              <PrepareContractButton
                jobId={resolvedParams.id}
                jobTitle={job.title || 'Untitled Job'}
              />
              {messageHref && (
                <Link href={messageHref} className='block'>
                  <Button
                    variant='outline'
                    fullWidth
                    leftIcon={<MessageCircle className='h-5 w-5' />}
                  >
                    Message Homeowner
                  </Button>
                </Link>
              )}
            </div>
          )}
          {currentStage === 'awaiting_payment' && messageHref && (
            <Link
              href={messageHref}
              className='block'
              style={{ marginTop: theme.spacing[2] }}
            >
              <Button
                variant='primary'
                fullWidth
                leftIcon={<MessageCircle className='h-5 w-5' />}
              >
                Message Homeowner
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* ═══ ZONE 3: HORIZONTAL PROGRESS STEPPER ═══ */}
      <JobProgressStepper steps={steps} />

      {/* ═══ ZONE 4: SUPPORTING CONTENT ═══ */}
      <div
        className='grid grid-cols-1 md:grid-cols-2'
        style={{ gap: theme.spacing[6] }}
      >
        {/* Left Column - Info */}
        <JobInfoSidebar job={job} homeowner={homeowner} />

        {/* Right Column - Stage-filtered Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[6],
          }}
        >
          {/* Contract summary (collapsed) - only when signed and not the primary action */}
          {currentStage !== 'contract_pending' &&
            (currentStage === 'awaiting_payment' ||
              currentStage === 'ready_to_start') && (
              <Card padding='lg' hover={false}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing[2],
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    Contract
                  </h3>
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.success,
                      backgroundColor: `${theme.colors.success}10`,
                      padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                      borderRadius: theme.borderRadius.full,
                    }}
                  >
                    Signed
                  </span>
                </div>
                <ContractManagement
                  jobId={resolvedParams.id}
                  userRole='contractor'
                  userId={user.id}
                />
              </Card>
            )}

          {/* Scheduling - only after contract accepted */}
          {(currentStage === 'awaiting_payment' ||
            currentStage === 'ready_to_start' ||
            currentStage === 'in_progress') && (
            <JobScheduling
              jobId={resolvedParams.id}
              userRole='contractor'
              userId={user.id}
              currentSchedule={{
                scheduled_start_date:
                  job.scheduled_start_date || contract?.start_date || null,
                scheduled_end_date:
                  job.scheduled_end_date || contract?.end_date || null,
                scheduled_duration_hours: job.scheduled_duration_hours || null,
              }}
              contractStatus={contractStatus}
            />
          )}

          {/* On My Way + Location Sharing - only when work is relevant */}
          {(currentStage === 'ready_to_start' ||
            currentStage === 'in_progress') && (
            <div
              className='grid grid-cols-1 sm:grid-cols-2'
              style={{ gap: theme.spacing[4] }}
            >
              <OnMyWayButton jobId={resolvedParams.id} contractorId={user.id} />
              <LocationSharing
                jobId={resolvedParams.id}
                contractorId={user.id}
              />
            </div>
          )}

          {/* Message Homeowner - always available */}
          {messageHref && (
            <Link href={messageHref} className='block'>
              <Button
                variant='secondary'
                fullWidth
                leftIcon={<MessageCircle className='h-5 w-5' />}
              >
                Message Homeowner
              </Button>
            </Link>
          )}

          {/* AI Building Assessment — visible to contractor too */}
          {(buildingAssessment || jobPhotoUrls.length > 0) && (
            <BuildingAssessmentDisplay
              assessment={
                ((buildingAssessment as Record<string, unknown> | null)
                  ?.assessment_data as Parameters<
                  typeof BuildingAssessmentDisplay
                >[0]['assessment']) ?? null
              }
              jobId={resolvedParams.id}
              photoUrls={jobPhotoUrls}
            />
          )}
        </div>
      </div>
    </div>
  );
}
