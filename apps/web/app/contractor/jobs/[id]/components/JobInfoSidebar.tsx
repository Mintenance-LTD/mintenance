import React from 'react';
import { Calendar, Mail, MapPin, Phone, PoundSterling } from 'lucide-react';
import { Card } from '@/components/ui/Card.unified';
import { theme } from '@/lib/theme';
import { RoomsScopeCard } from './RoomsScopeCard';

interface Homeowner {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
}

interface JobForSidebar {
  id?: string;
  budget?: number | null;
  description?: string | null;
  scheduled_start_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
}

export function JobInfoSidebar({
  job,
  homeowner,
}: {
  job: JobForSidebar;
  homeowner: Homeowner | null;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}
    >
      <BudgetCard budget={job.budget ?? 0} />
      <JobDetailsCard
        description={job.description}
        scheduledStartDate={job.scheduled_start_date}
      />
      {/* Property Rooms Slice 3 — self-fetches /api/jobs/[id]/rooms
          and renders nothing for legacy jobs with no room scope. */}
      {job.id ? <RoomsScopeCard jobId={job.id} /> : null}
      {homeowner && <HomeownerCard homeowner={homeowner} />}
      {((job.latitude && job.longitude) || job.location) && (
        <JobLocationCard
          latitude={job.latitude ?? null}
          longitude={job.longitude ?? null}
          location={job.location ?? null}
        />
      )}
    </div>
  );
}

function BudgetCard({ budget }: { budget: number }) {
  return (
    <Card padding='lg' hover={false}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              marginBottom: theme.spacing[1],
            }}
          >
            Budget
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            £{Number(budget || 0).toLocaleString()}
          </div>
        </div>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: `${theme.colors.success}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PoundSterling
            className='h-5 w-5'
            style={{ color: theme.colors.success }}
          />
        </div>
      </div>
    </Card>
  );
}

function JobDetailsCard({
  description,
  scheduledStartDate,
}: {
  description?: string | null;
  scheduledStartDate?: string | null;
}) {
  return (
    <Card padding='lg' hover={false}>
      <h3
        style={{
          margin: 0,
          marginBottom: theme.spacing[4],
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
        }}
      >
        Job Details
      </h3>
      <div
        style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textPrimary,
          lineHeight: 1.7,
          padding: theme.spacing[3],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
        }}
      >
        {description || 'No description provided'}
      </div>
      {scheduledStartDate && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            marginTop: theme.spacing[4],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
          }}
        >
          <Calendar
            className='h-4 w-4'
            style={{ color: theme.colors.primary, flexShrink: 0 }}
          />
          <div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                marginBottom: '2px',
              }}
            >
              Scheduled Start
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textPrimary,
              }}
            >
              {new Date(scheduledStartDate).toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function HomeownerCard({ homeowner }: { homeowner: Homeowner }) {
  return (
    <Card padding='lg' hover={false}>
      <h3
        style={{
          margin: 0,
          marginBottom: theme.spacing[3],
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
        }}
      >
        Homeowner
      </h3>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.full,
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primary}CC 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.bold,
            color: 'white',
            flexShrink: 0,
          }}
        >
          {homeowner.first_name?.[0]}
          {homeowner.last_name?.[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: '2px',
            }}
          >
            {homeowner.first_name} {homeowner.last_name}
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
            }}
          >
            <Mail className='h-3 w-3' />
            {homeowner.email}
          </div>
          {homeowner.phone && (
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
                marginTop: '2px',
              }}
            >
              <Phone className='h-3 w-3' />
              {homeowner.phone}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function JobLocationCard({
  latitude,
  longitude,
  location,
}: {
  latitude: number | null;
  longitude: number | null;
  location: string | null;
}) {
  return (
    <Card padding='lg' hover={false}>
      <h3
        style={{
          margin: 0,
          marginBottom: theme.spacing[3],
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}
      >
        <MapPin className='h-4 w-4' style={{ color: theme.colors.primary }} />
        Job Location
      </h3>
      {location && (
        <p
          style={{
            margin: 0,
            marginBottom: theme.spacing[3],
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}
        >
          {location}
        </p>
      )}
      <div
        style={{
          width: '100%',
          height: '200px',
          borderRadius: theme.borderRadius.md,
          overflow: 'hidden',
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        {latitude && longitude ? (
          <iframe
            width='100%'
            height='100%'
            frameBorder='0'
            style={{ border: 0 }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.003},${longitude + 0.005},${latitude + 0.003}&layer=mapnik&marker=${latitude},${longitude}`}
            title='Job Location Map'
          />
        ) : (
          <iframe
            width='100%'
            height='100%'
            frameBorder='0'
            style={{ border: 0 }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=-2.1,-0.5,2.1,0.5&layer=mapnik`}
            title='Job Location Map'
          />
        )}
      </div>
      {latitude && longitude && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
          target='_blank'
          rel='noopener noreferrer'
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            marginTop: theme.spacing[3],
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.primary,
            textDecoration: 'none',
          }}
        >
          <MapPin className='h-4 w-4' />
          Get Directions
        </a>
      )}
    </Card>
  );
}
