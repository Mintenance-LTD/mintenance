'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface Job {
  id: string;
  title: string;
  description: string;
  budget: string;
  location: string;
  category: string;
  status: string;
  createdAt: string;
  postedBy?: {
    name: string;
  };
}

type FilterKey = 'available' | 'recommended' | 'saved';

export default function ContractorBidsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('available');

  useEffect(() => {
    document.title = 'Jobs & Bids | Mintenance';
  }, []);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/jobs?limit=20&status=posted`);
        if (response.ok) {
          const data = await response.json();
          setJobs(data.jobs || []);
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [filter]);

  const filteredJobs = useMemo(() => {
    if (filter === 'available') return jobs;
    if (filter === 'recommended') {
      return jobs.slice(0, Math.min(5, jobs.length));
    }
    return [];
  }, [jobs, filter]);

  const summaryCards = [
    { label: 'Jobs available', value: jobs.length },
    { label: 'Recommended for you', value: Math.min(5, jobs.length) },
    { label: 'Saved bids', value: 0 },
  ];

  const handleBidClick = (jobId: string) => {
    router.push(`/contractor/bid/${jobId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
        <div>
          <h1
            style={{
              display: 'flex',
              gap: theme.spacing[3],
              alignItems: 'center',
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            <Icon name='briefcase' size={32} color={theme.colors.primary} />
            Jobs & Bids
          </h1>
          <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Browse open projects, review requirements, and submit a tailored bid in minutes.
          </p>
        </div>

        <Button variant='primary' size='sm' onClick={() => router.push('/contractor/quotes/create')}>
          Create Quick Quote
        </Button>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        {summaryCards.map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: '20px',
              border: `1px solid ${theme.colors.border}`,
              padding: theme.spacing[5],
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[1],
            }}
          >
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>{card.label}</span>
            <span style={{ fontSize: theme.typography.fontSize['3xl'], fontWeight: theme.typography.fontWeight.bold }}>
              {card.value}
            </span>
          </div>
        ))}
      </section>

      <nav style={{ display: 'flex', gap: theme.spacing[3], borderBottom: `1px solid ${theme.colors.border}` }}>
        {([
          { key: 'available', label: 'All jobs' },
          { key: 'recommended', label: 'Recommended' },
          { key: 'saved', label: 'Saved bids' },
        ] as { key: FilterKey; label: string }[]).map((item) => {
          const isActive = filter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                borderBottom: isActive ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: isActive ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <section style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
        {loading ? (
          <div style={{ color: theme.colors.textSecondary }}>Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: `${theme.spacing[12]} 0`,
              color: theme.colors.textSecondary,
              borderRadius: '20px',
              border: `1px dashed ${theme.colors.border}`,
              backgroundColor: theme.colors.backgroundSecondary,
            }}
          >
            <div style={{ marginBottom: theme.spacing[4], display: 'flex', justifyContent: 'center' }}>
              <Icon name='briefcase' size={48} color={theme.colors.textQuaternary} />
            </div>
            <h3 style={{ fontSize: theme.typography.fontSize.xl, marginBottom: theme.spacing[2], color: theme.colors.textPrimary }}>
              No jobs in this view yet
            </h3>
            <p>Check back later or adjust your filters to discover more opportunities.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <article
              key={job.id}
              style={{
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                borderRadius: '20px',
                padding: theme.spacing[5],
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[4],
              }}
            >
              <header style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing[4] }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                  <h2
                    style={{
                      fontSize: theme.typography.fontSize.xl,
                      fontWeight: theme.typography.fontWeight.bold,
                      margin: 0,
                    }}
                  >
                    {job.title}
                  </h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[3], fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name='mapPin' size={14} color={theme.colors.textSecondary} />
                      {job.location || 'Location not specified'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name='briefcase' size={14} color={theme.colors.textSecondary} />
                      {job.category || 'General'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name='currencyDollar' size={14} color={theme.colors.success} />
                      {job.budget || 'Budget TBD'}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    alignSelf: 'flex-start',
                    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                    borderRadius: '12px',
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {job.status || 'Open'}
                </span>
              </header>

              <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, lineHeight: 1.6, margin: 0 }}>
                {job.description.length > 220 ? `${job.description.substring(0, 220)}...` : job.description}
              </p>

              <footer
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: `1px solid ${theme.colors.border}`,
                  paddingTop: theme.spacing[4],
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                }}
              >
                <span>
                  Posted {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {job.postedBy && ` - ${job.postedBy.name}`}
                </span>
                <Button variant='primary' size='sm' onClick={() => handleBidClick(job.id)}>
                  Submit bid
                </Button>
              </footer>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
