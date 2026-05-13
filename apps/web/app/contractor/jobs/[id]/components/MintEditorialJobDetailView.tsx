'use client';

/**
 * Mint Editorial port of `/contractor/jobs/[id]` — the editorial
 * layout target requested in the 2026-05-12 user-feedback
 * screenshots.
 *
 * Layout (from the editorial mock):
 *   - Header: back link + job title (`.t-h1`) + meta row
 *     (status badge · location · escrow held · posted date)
 *   - Two-column body (lg+):
 *     - Left main:
 *       - Job progress pill segments (5-step horizontal)
 *       - Stage action card (primary CTA matching the lifecycle stage)
 *       - Customer brief card (description + photo grid)
 *       - AI Building Assessment + Contract + Scheduling sections
 *     - Right sidebar (sticky on lg+):
 *       - Customer card (homeowner avatar + name + Message / Call)
 *       - Job info card (budget / location / posted)
 *       - "You'll be paid" earnings breakdown
 *
 * Reuses existing data-bearing components where possible
 * (ContractManagement, JobPhotoUpload, JobScheduling, OnMyWayButton,
 * LocationSharing, BuildingAssessmentDisplay) and only re-skins the
 * page-level chrome around them. Those components are already
 * theme-aware via the prior Phase-4 commits.
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  MapPin,
  PoundSterling,
  Calendar,
  MessageCircle,
  Phone,
  ShieldCheck,
  Navigation,
  Info,
} from 'lucide-react';
import { DynamicGoogleMap } from '@/components/maps';
import { ContractManagement } from '@/app/jobs/[id]/components/ContractManagement';
import { JobScheduling } from '@/app/jobs/[id]/components/JobScheduling';
import { BuildingAssessmentDisplay } from '@/app/jobs/[id]/components/BuildingAssessmentDisplay';
import { JobPhotoUpload } from './JobPhotoUpload';
import { OnMyWayButton } from './OnMyWayButton';
import { LocationSharing } from './LocationSharing';
import { PrepareContractButton } from './PrepareContractButton';
import { PreArrivalChecklist } from './PreArrivalChecklist';

interface ProgressStep {
  label: string;
  state: 'pending' | 'current' | 'complete';
}

interface JobShape {
  id: string;
  title: string | null;
  description?: string | null;
  status: string | null;
  budget?: number | string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
  scheduled_start_date?: string | null;
  scheduled_end_date?: string | null;
  scheduled_duration_hours?: number | null;
}

interface HomeownerShape {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_image_url?: string | null;
}

interface ContractShape {
  start_date: string | null;
  end_date: string | null;
}

export interface PropertyAccessShape {
  access_mode: 'key_safe' | 'smart_lock' | 'in_person' | null;
  /**
   * Sensitive — should ONLY be populated when the contractor is
   * allowed to see it (stage = ready_to_start | in_progress, and
   * ideally within 1h of scheduled start). The caller is responsible
   * for masking; this prop trusts what it receives.
   */
  key_safe_code: string | null;
  access_notes: string | null;
  stopcock_location: string | null;
  gas_isolator_location: string | null;
  consumer_unit_location: string | null;
}

interface MintEditorialJobDetailViewProps {
  job: JobShape;
  homeowner: HomeownerShape | null;
  contract: ContractShape | null;
  property: PropertyAccessShape | null;
  contractStatus: string;
  currentStage: string;
  stageTitle: string;
  stageSubtitle: string;
  steps: ProgressStep[];
  escrowHeld: boolean;
  escrowStatus: string;
  jobPhotoUrls: string[];
  buildingAssessment: unknown;
  userId: string;
  messageHref: string | null;
}

function formatGbp(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatPostedDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_BADGE_VARIANT: Record<string, string> = {
  posted: 'badge-info',
  assigned: 'badge-warn',
  in_progress: 'badge-brand',
  completed: 'badge-ok',
  cancelled: 'badge-mute',
  disputed: 'badge-err',
};

function statusLabel(status: string | null): string {
  if (!status) return 'Posted';
  return status
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function MintEditorialJobDetailView({
  job,
  homeowner,
  contract,
  property,
  contractStatus,
  currentStage,
  stageTitle,
  stageSubtitle,
  steps,
  escrowHeld,
  escrowStatus,
  jobPhotoUrls,
  buildingAssessment,
  userId,
  messageHref,
}: MintEditorialJobDetailViewProps) {
  const budgetNum =
    typeof job.budget === 'number'
      ? job.budget
      : job.budget
        ? parseFloat(String(job.budget))
        : 0;
  const platformFeePct = 0.08;
  const platformFee = budgetNum * platformFeePct;
  const netToYou = budgetNum - platformFee;
  const homeownerName = homeowner
    ? `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() ||
      homeowner.email ||
      'Customer'
    : 'Customer';
  const homeownerInitials = homeownerName
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const badgeClass =
    STATUS_BADGE_VARIANT[job.status || 'posted'] || 'badge-info';

  return (
    <div className='col' style={{ gap: 20 }}>
      {/* Back link */}
      <div>
        <Link href='/contractor/jobs' className='btn btn-ghost btn-sm'>
          <ArrowLeft size={14} strokeWidth={1.75} />
          Back to jobs
        </Link>
      </div>

      {/* Header */}
      <div className='col' style={{ gap: 10 }}>
        <h1 className='t-h1'>{job.title || 'Untitled job'}</h1>
        <div
          className='row'
          style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <span className={`badge ${badgeClass}`}>
            {statusLabel(job.status)}
          </span>
          {job.location ? (
            <span
              className='t-meta'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MapPin size={12} strokeWidth={1.75} />
              {job.location}
            </span>
          ) : null}
          {job.created_at ? (
            <span
              className='t-meta'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Calendar size={12} strokeWidth={1.75} />
              Posted {formatPostedDate(job.created_at)}
            </span>
          ) : null}
          {escrowHeld ? (
            <span
              className='t-meta'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: 'var(--me-brand)',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={12} strokeWidth={1.75} />£
              {budgetNum.toFixed(0)} held in escrow
            </span>
          ) : null}
        </div>
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* ════════ LEFT MAIN COLUMN ════════ */}
        <div className='col' style={{ gap: 16 }}>
          {/* Job progress pill segments */}
          <div className='card card-pad'>
            <div className='col' style={{ gap: 14 }}>
              <h2 className='t-h3'>Job progress</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
                  gap: 6,
                }}
              >
                {steps.map((step, idx) => (
                  <div key={idx} className='col' style={{ gap: 6 }}>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background:
                          step.state === 'complete' || step.state === 'current'
                            ? 'var(--me-brand)'
                            : 'var(--me-bg-3)',
                        opacity: step.state === 'current' ? 0.75 : 1,
                      }}
                    />
                    <span
                      className='t-meta'
                      style={{
                        fontSize: 11,
                        fontWeight: step.state === 'current' ? 700 : 500,
                        color:
                          step.state === 'complete' || step.state === 'current'
                            ? 'var(--me-ink)'
                            : 'var(--me-ink-3)',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stage action card */}
          {job.status !== 'cancelled' && (
            <div
              className='card card-pad'
              style={{ borderLeft: '4px solid var(--me-brand)' }}
            >
              <div className='col' style={{ gap: 14 }}>
                <div className='col' style={{ gap: 4 }}>
                  <h2 className='t-h2'>{stageTitle}</h2>
                  <p className='t-body'>{stageSubtitle}</p>
                </div>

                {currentStage === 'contract_pending' ? (
                  <ContractManagement
                    jobId={job.id}
                    userRole='contractor'
                    userId={userId}
                  />
                ) : null}

                {(currentStage === 'ready_to_start' ||
                  currentStage === 'in_progress' ||
                  currentStage === 'completed') && (
                  <JobPhotoUpload
                    jobId={job.id}
                    jobStatus={job.status || 'posted'}
                    latitude={job.latitude ?? undefined}
                    longitude={job.longitude ?? undefined}
                    location={job.location ?? undefined}
                  />
                )}

                {currentStage === 'contract_preparing' && (
                  <div className='col' style={{ gap: 10 }}>
                    <PrepareContractButton
                      jobId={job.id}
                      jobTitle={job.title || 'Untitled job'}
                    />
                    {messageHref && (
                      <Link href={messageHref} className='block'>
                        <button
                          type='button'
                          className='btn btn-secondary'
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                          }}
                        >
                          <MessageCircle size={15} strokeWidth={1.75} /> Message
                          homeowner
                        </button>
                      </Link>
                    )}
                  </div>
                )}

                {currentStage === 'awaiting_payment' && messageHref && (
                  <Link href={messageHref} className='block'>
                    <button
                      type='button'
                      className='btn btn-primary'
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <MessageCircle size={15} strokeWidth={1.75} /> Message
                      homeowner
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Customer brief */}
          {(job.description || jobPhotoUrls.length > 0) && (
            <div className='card card-pad'>
              <div className='col' style={{ gap: 12 }}>
                <h2 className='t-h3'>Customer brief</h2>
                {job.description ? (
                  <p
                    className='t-body'
                    style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                  >
                    {job.description}
                  </p>
                ) : null}
                {jobPhotoUrls.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {jobPhotoUrls.slice(0, 6).map((url, idx) => (
                      <div
                        key={idx}
                        style={{
                          aspectRatio: '4 / 3',
                          borderRadius: 10,
                          overflow: 'hidden',
                          background: 'var(--me-bg-2)',
                          border: '1px solid var(--me-line)',
                          position: 'relative',
                        }}
                      >
                        <Image
                          src={url}
                          alt={`Job photo ${idx + 1}`}
                          fill
                          sizes='(max-width: 768px) 50vw, 200px'
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Pre-arrival checklist — hidden when there are no items
              (component renders null), so the homeowner controls
              whether this slot appears. */}
          <PreArrivalChecklist jobId={job.id} />

          {/* AI Building Assessment */}
          {(buildingAssessment || jobPhotoUrls.length > 0) && (
            <BuildingAssessmentDisplay
              assessment={
                ((buildingAssessment as Record<string, unknown> | null)
                  ?.assessment_data as Parameters<
                  typeof BuildingAssessmentDisplay
                >[0]['assessment']) ?? null
              }
              jobId={job.id}
              photoUrls={jobPhotoUrls}
            />
          )}

          {/* Contract summary (when signed) */}
          {currentStage !== 'contract_pending' &&
            (currentStage === 'awaiting_payment' ||
              currentStage === 'ready_to_start' ||
              currentStage === 'in_progress' ||
              currentStage === 'completed') && (
              <div className='card card-pad'>
                <div className='col' style={{ gap: 10 }}>
                  <div className='between' style={{ alignItems: 'center' }}>
                    <h3 className='t-h3'>Contract</h3>
                    <span className='badge badge-ok'>Signed</span>
                  </div>
                  <ContractManagement
                    jobId={job.id}
                    userRole='contractor'
                    userId={userId}
                  />
                </div>
              </div>
            )}

          {/* Scheduling */}
          {(currentStage === 'awaiting_payment' ||
            currentStage === 'ready_to_start' ||
            currentStage === 'in_progress') && (
            <JobScheduling
              jobId={job.id}
              userRole='contractor'
              userId={userId}
              currentSchedule={{
                scheduled_start_date:
                  job.scheduled_start_date || contract?.start_date || null,
                scheduled_end_date:
                  job.scheduled_end_date || contract?.end_date || null,
                scheduled_duration_hours: job.scheduled_duration_hours || null,
              }}
              contractStatus={
                contractStatus as 'none' | 'pending' | 'accepted' | undefined
              }
            />
          )}

          {/* On My Way + Location Sharing */}
          {(currentStage === 'ready_to_start' ||
            currentStage === 'in_progress') && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              <OnMyWayButton jobId={job.id} contractorId={userId} />
              <LocationSharing jobId={job.id} contractorId={userId} />
            </div>
          )}
        </div>

        {/* ════════ RIGHT SIDEBAR ════════ */}
        <aside className='col' style={{ gap: 12, position: 'sticky', top: 20 }}>
          {/* Customer card */}
          {homeowner ? (
            <div className='card card-pad'>
              <div className='col' style={{ gap: 12 }}>
                <div className='row' style={{ gap: 12, alignItems: 'center' }}>
                  {homeowner.profile_image_url ? (
                    <Image
                      src={homeowner.profile_image_url}
                      alt={homeownerName}
                      width={44}
                      height={44}
                      className='avatar avatar-md'
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <span
                      className='avatar avatar-md'
                      style={{
                        background: 'var(--me-brand-soft)',
                        color: 'var(--me-brand)',
                        fontWeight: 700,
                      }}
                    >
                      {homeownerInitials}
                    </span>
                  )}
                  <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {homeownerName}
                    </span>
                    <span className='t-meta'>Homeowner</span>
                  </div>
                </div>

                <div className='row' style={{ gap: 8 }}>
                  {messageHref ? (
                    <Link
                      href={messageHref}
                      className='btn btn-secondary btn-sm'
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <MessageCircle size={13} strokeWidth={1.75} />
                      Message
                    </Link>
                  ) : null}
                  {homeowner.phone ? (
                    <a
                      href={`tel:${homeowner.phone}`}
                      className='btn btn-secondary btn-sm'
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Phone size={13} strokeWidth={1.75} />
                      Call
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* Job info */}
          <div className='card card-pad'>
            <div className='col' style={{ gap: 12 }}>
              <h3 className='t-h3'>Job details</h3>
              <div className='col' style={{ gap: 10 }}>
                <div className='between'>
                  <span className='t-meta'>Budget</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {formatGbp(budgetNum)}
                  </span>
                </div>
                {job.location ? (
                  <div
                    className='between'
                    style={{ alignItems: 'flex-start', gap: 12 }}
                  >
                    <span className='t-meta'>Location</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        textAlign: 'right',
                        maxWidth: '60%',
                      }}
                    >
                      {job.location}
                    </span>
                  </div>
                ) : null}
                {job.created_at ? (
                  <div className='between'>
                    <span className='t-meta'>Posted</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {formatPostedDate(job.created_at)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Map + Navigate — shown when the job has either explicit
              lat/lng or a location string we can hand to Google/Apple
              Maps. Tap "Navigate" opens the OS-default maps app with
              turn-by-turn directions from the contractor's current
              location. */}
          {(job.latitude && job.longitude) || job.location ? (
            <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
              {job.latitude && job.longitude ? (
                <div style={{ height: 180, position: 'relative' }}>
                  <DynamicGoogleMap
                    center={{ lat: job.latitude, lng: job.longitude }}
                    zoom={15}
                    onMapLoad={(map) => {
                      if (typeof google === 'undefined') return;
                      new google.maps.Marker({
                        position: {
                          lat: job.latitude!,
                          lng: job.longitude!,
                        },
                        map,
                      });
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--me-bg-2)',
                    color: 'var(--me-ink-3)',
                    fontSize: 13,
                  }}
                >
                  Address-only — open in Maps for directions.
                </div>
              )}
              <div
                className='col'
                style={{
                  gap: 10,
                  padding: 14,
                  borderTop: '1px solid var(--me-line)',
                }}
              >
                {job.location ? (
                  <div className='col' style={{ gap: 2 }}>
                    <span className='t-meta'>Job address</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {job.location}
                    </span>
                  </div>
                ) : null}
                <a
                  href={
                    job.latitude && job.longitude
                      ? `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}&travelmode=driving`
                      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.location || '')}&travelmode=driving`
                  }
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn btn-primary btn-sm'
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Navigation size={13} strokeWidth={1.75} />
                  Navigate
                </a>
              </div>
            </div>
          ) : null}

          {/* Access details — uses the property fields from migration
              20260520000003. When the homeowner has set the access mode
              on /properties/[id], the contractor sees it here without
              having to chase via chat. Key safe code is only surfaced
              once the contractor is on a job stage that needs it
              (ready_to_start / in_progress) — the page-level fetch
              should mask it before this view ever sees the value
              (defence-in-depth for any future client-side hydration). */}
          {property?.access_mode ||
          property?.access_notes ||
          property?.stopcock_location ? (
            <div className='card card-pad'>
              <div className='col' style={{ gap: 10 }}>
                <div className='row' style={{ gap: 8, alignItems: 'center' }}>
                  <Info
                    size={14}
                    strokeWidth={1.75}
                    style={{ color: 'var(--me-brand)' }}
                  />
                  <h3 className='t-h3' style={{ margin: 0 }}>
                    Access details
                  </h3>
                </div>

                {property.access_mode ? (
                  <div className='col' style={{ gap: 4 }}>
                    <span className='t-meta'>How to get in</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {property.access_mode === 'key_safe'
                        ? 'Key safe'
                        : property.access_mode === 'smart_lock'
                          ? 'Smart lock'
                          : 'Homeowner will be home'}
                    </span>
                  </div>
                ) : null}

                {property.key_safe_code &&
                (currentStage === 'ready_to_start' ||
                  currentStage === 'in_progress') ? (
                  <div className='col' style={{ gap: 4 }}>
                    <span className='t-meta'>Lock-box code</span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: 'var(--me-brand)',
                      }}
                    >
                      {property.key_safe_code}
                    </span>
                  </div>
                ) : null}

                {property.access_notes ? (
                  <div className='col' style={{ gap: 4 }}>
                    <span className='t-meta'>Notes from homeowner</span>
                    <p
                      className='t-body'
                      style={{
                        fontSize: 13,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                      }}
                    >
                      {property.access_notes}
                    </p>
                  </div>
                ) : null}

                {(property.stopcock_location ||
                  property.gas_isolator_location ||
                  property.consumer_unit_location) && (
                  <div
                    className='col'
                    style={{
                      gap: 6,
                      padding: 10,
                      borderRadius: 8,
                      background: 'var(--me-bg-2)',
                      marginTop: 4,
                    }}
                  >
                    <span className='t-meta' style={{ fontWeight: 600 }}>
                      Stopcock & isolators
                    </span>
                    {property.stopcock_location ? (
                      <span style={{ fontSize: 12 }}>
                        Water stopcock: {property.stopcock_location}
                      </span>
                    ) : null}
                    {property.gas_isolator_location ? (
                      <span style={{ fontSize: 12 }}>
                        Gas isolator: {property.gas_isolator_location}
                      </span>
                    ) : null}
                    {property.consumer_unit_location ? (
                      <span style={{ fontSize: 12 }}>
                        Consumer unit: {property.consumer_unit_location}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Fallback: no access info on file → tell the contractor to ask.
            <div
              className='card'
              style={{
                padding: 12,
                background: 'var(--me-bg-2)',
                borderColor: 'var(--me-line)',
              }}
            >
              <div
                className='row'
                style={{ gap: 10, alignItems: 'flex-start' }}
              >
                <Info
                  size={16}
                  strokeWidth={1.75}
                  style={{
                    color: 'var(--me-warm)',
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                />
                <div className='col' style={{ gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Access details
                  </span>
                  <p className='t-body' style={{ fontSize: 13 }}>
                    Homeowner hasn&apos;t set default access yet. Confirm how to
                    get in via the message thread before you set off.
                  </p>
                  {messageHref ? (
                    <Link
                      href={messageHref}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--me-brand)',
                        textDecoration: 'underline',
                      }}
                    >
                      Open conversation →
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* You'll be paid */}
          {budgetNum > 0 ? (
            <div className='card card-pad'>
              <div className='col' style={{ gap: 12 }}>
                <div className='row' style={{ gap: 8, alignItems: 'center' }}>
                  <PoundSterling
                    size={16}
                    strokeWidth={1.75}
                    style={{ color: 'var(--me-brand)' }}
                  />
                  <h3 className='t-h3' style={{ margin: 0 }}>
                    You&apos;ll be paid
                  </h3>
                </div>
                <div className='col' style={{ gap: 8 }}>
                  <div className='between'>
                    <span className='t-meta'>Bid amount</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {formatGbp(budgetNum)}
                    </span>
                  </div>
                  <div className='between'>
                    <span className='t-meta'>
                      Mintenance fee ({Math.round(platformFeePct * 100)}%)
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--me-ink-2)',
                      }}
                    >
                      −{formatGbp(platformFee)}
                    </span>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid var(--me-line)',
                      paddingTop: 8,
                      marginTop: 4,
                    }}
                    className='between'
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      Net to you
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--me-brand)',
                      }}
                    >
                      {formatGbp(netToYou)}
                    </span>
                  </div>
                </div>
                <p
                  className='t-meta'
                  style={{
                    color:
                      escrowStatus === 'released'
                        ? 'var(--me-ok)'
                        : 'var(--me-ink-3)',
                  }}
                >
                  {escrowStatus === 'released'
                    ? 'Released to your Stripe account.'
                    : escrowHeld
                      ? 'Released within 24h of homeowner approval.'
                      : 'Payment moves to escrow once the homeowner pays.'}
                </p>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
