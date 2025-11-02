'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface Job {
  id: string;
  title: string;
  description?: string;
  budget?: string;
  location?: string;
  category?: string;
  status: string;
  createdAt: string;
  photos?: string[];
  postedBy?: {
    name: string;
  };
}

type FilterKey = 'available' | 'recommended' | 'saved';

interface BidWithJob {
  id: string;
  job_id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  updated_at?: string;
  jobs?: {
    id: string;
    title: string;
    description?: string;
    budget?: string;
    location?: string;
    category?: string;
    status: string;
    created_at: string;
    photos?: string[];
  };
}

export default function ContractorBidsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [allBids, setAllBids] = useState<BidWithJob[]>([]); // Store all bids to check against jobs
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('available');
  
  // Safety check for theme
  if (!theme || !theme.colors || !theme.spacing || !theme.typography) {
    console.error('Theme is not properly initialized');
    return <div>Loading...</div>;
  }

  useEffect(() => {
    document.title = 'Jobs & Bids | Mintenance';
  }, []);

  // Fetch bids separately to check against jobs
  useEffect(() => {
    const loadBids = async () => {
      try {
        const response = await fetch('/api/contractor/bids');
        if (response.ok) {
          const data = await response.json();
          const bidsData = Array.isArray(data.bids) ? data.bids : [];
          setAllBids(bidsData);
        } else {
          setAllBids([]);
        }
      } catch (error) {
        console.error('Error loading bids:', error);
        setAllBids([]);
      }
    };

    loadBids();

    // Refresh bids when page becomes visible (e.g., after returning from bid submission)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBids();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Load once on mount and refresh on visibility change

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (filter === 'saved') {
          // Fetch contractor's bids with job details
          const response = await fetch('/api/contractor/bids');
          if (response.ok) {
            const data = await response.json();
            const bidsData = Array.isArray(data.bids) ? data.bids : [];
            setBids(bidsData);
            setAllBids(bidsData); // Also update allBids when fetching saved bids to keep count accurate
            setJobs([]); // Clear jobs when showing bids
          } else {
            setBids([]);
            setJobs([]);
          }
        } else {
          // Fetch available jobs
          const response = await fetch(`/api/jobs?limit=20&status=posted`);
          if (response.ok) {
            const data = await response.json();
            // Ensure we always set an array, and filter out any invalid job objects
            const jobsData = Array.isArray(data.jobs) 
              ? data.jobs.filter((job: any) => job && typeof job === 'object' && job.id)
              : [];
            setJobs(jobsData);
            setBids([]); // Clear bids when showing jobs
          } else {
            // On error, ensure we still have an empty array
            setJobs([]);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setJobs([]); // Ensure we always have an array, even on error
        setBids([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filter]);

  const filteredJobs = useMemo(() => {
    try {
      // Ensure all inputs are arrays before processing
      const safeJobs = Array.isArray(jobs) ? jobs : [];
      const safeBids = Array.isArray(bids) ? bids : [];
      const safeAllBids = Array.isArray(allBids) ? allBids : [];
      
      // Early return if critical data is missing
      if (!safeJobs || !safeBids || !safeAllBids) {
        return [];
      }
      
      if (filter === 'saved') {
        // Transform bids into jobs for display
        if (safeBids.length === 0) {
          return [];
        }
        
        const result = safeBids
          .filter((bid) => {
            if (!bid || typeof bid !== 'object') return false;
            if (!bid.jobs || typeof bid.jobs !== 'object') return false;
            if (!bid.jobs.id || typeof bid.jobs.id !== 'string') return false;
            return true;
          })
          .map((bid) => ({
            id: bid.jobs!.id,
            title: bid.jobs!.title || 'Untitled Job',
            description: bid.jobs!.description,
            budget: bid.jobs!.budget,
            location: bid.jobs!.location,
            category: bid.jobs!.category,
            status: bid.jobs!.status,
            createdAt: bid.jobs!.created_at || bid.created_at,
            photos: Array.isArray(bid.jobs!.photos) ? bid.jobs!.photos : [],
            bidAmount: bid.amount,
            bidStatus: bid.status,
            bidCreatedAt: bid.created_at,
            bidUpdatedAt: bid.updated_at,
            hasBid: true, // Always true for saved bids
          }))
          .sort((a, b) => {
            // Sort by most recently updated bid, then by bid creation date
            const aDate = a.bidUpdatedAt || a.bidCreatedAt || '';
            const bDate = b.bidUpdatedAt || b.bidCreatedAt || '';
            return new Date(bDate).getTime() - new Date(aDate).getTime();
          });
        
        return Array.isArray(result) ? result : [];
      }
      
      // Ensure jobs is always an array - defensive check
      if (safeJobs.length === 0) {
        return [];
      }
      
      // Create a set of job IDs that have been bid on
      const bidJobIds = new Set(
        safeAllBids
          .filter((bid) => {
            if (!bid || typeof bid !== 'object') return false;
            if (!bid.jobs || typeof bid.jobs !== 'object') return false;
            return !!bid.jobs.id && typeof bid.jobs.id === 'string';
          })
          .map((bid) => bid.jobs!.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      );
      
      // Filter out jobs that have been bid on from available/recommended tabs
      // They should only appear in the "saved" tab
      // Use safeJobs which is already validated as an array
      const jobsWithoutBids = safeJobs.filter((job) => {
        if (!job || typeof job !== 'object') return false;
        if (!job.id || typeof job.id !== 'string') return false;
        return !bidJobIds.has(job.id);
      });
      
      if (filter === 'available') {
        return Array.isArray(jobsWithoutBids) ? jobsWithoutBids : [];
      }
      if (filter === 'recommended') {
        if (!Array.isArray(jobsWithoutBids)) {
          return [];
        }
        const recommended = jobsWithoutBids.slice(0, Math.min(5, jobsWithoutBids.length));
        return Array.isArray(recommended) ? recommended : [];
      }
      return [];
    } catch (error) {
      console.error('Error computing filteredJobs:', error);
      return [];
    }
  }, [jobs, bids, allBids, filter]);

  // Ensure jobs is always an array for summary cards
  const safeJobsArray = Array.isArray(jobs) ? jobs : [];
  const safeBidsArray = Array.isArray(bids) ? bids : [];
  const safeAllBidsArray = Array.isArray(allBids) ? allBids : [];
  const summaryCards = [
    { label: 'Jobs available', value: safeJobsArray.length },
    { label: 'Recommended for you', value: Math.min(5, safeJobsArray.length) },
    { label: 'Saved bids', value: safeAllBidsArray.length }, // Use allBids instead of bids to show count regardless of filter
  ];

  const handleBidClick = (jobId: string) => {
    router.push(`/contractor/bid/${jobId}`);
  };

  const handleCardClick = (jobId: string) => {
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
        ) : !filteredJobs || !Array.isArray(filteredJobs) || filteredJobs.length === 0 ? (
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
          (() => {
            // Ensure filteredJobs is always an array before processing
            const safeFilteredJobs = Array.isArray(filteredJobs) ? filteredJobs : [];
            if (!safeFilteredJobs || safeFilteredJobs.length === 0) {
              return [];
            }
            
            // First filter out any undefined/null values, then validate jobs
            return safeFilteredJobs
              .filter((job) => {
                // First check if job exists
                if (!job) return false;
                
                // Strict filtering - ensure job is a valid object with required properties
                try {
                  return typeof job === 'object' && 
                         job !== null &&
                         'id' in job &&
                         job.id !== null &&
                         job.id !== undefined &&
                         typeof job.id === 'string' &&
                         job.id.length > 0;
                } catch (error) {
                  console.warn('Error filtering job:', error, job);
                  return false;
                }
              })
              .map((job) => {
              // Double-check - this should never happen after filtering, but be defensive
              try {
                if (!job || typeof job !== 'object' || job === null || !('id' in job) || !job.id || typeof job.id !== 'string' || job.id.length === 0) {
                  console.warn('Invalid job in map:', job);
                  return null;
                }
              } catch (error) {
                console.warn('Error validating job in map:', error, job);
                return null;
              }
              
              try {
                // Safely normalize photos before spreading
                let normalizedPhotos: string[] = [];
                if (Array.isArray(job.photos)) {
                  normalizedPhotos = job.photos;
                } else if (job.photos && typeof job.photos === 'object') {
                  // If it's an object but not an array, check if it has array-like properties
                  // Otherwise default to empty array
                  normalizedPhotos = [];
                } else if (job.photos && typeof job.photos === 'string') {
                  // If it's a single string, wrap it in an array
                  normalizedPhotos = [job.photos];
                } else {
                  // Default to empty array for undefined, null, or other types
                  normalizedPhotos = [];
                }
                
                // Ensure photos is always an array or undefined
                const safeJob: any = {
                  id: String(job.id), // Ensure id is always a string
                  photos: normalizedPhotos,
                  title: typeof job.title === 'string' ? job.title : 'Untitled Job',
                  description: typeof job.description === 'string' ? job.description : '',
                  location: typeof job.location === 'string' ? job.location : undefined,
                  category: typeof job.category === 'string' ? job.category : undefined,
                  budget: typeof job.budget === 'string' || typeof job.budget === 'number' ? job.budget : undefined,
                  status: typeof job.status === 'string' ? job.status : 'posted',
                  createdAt: typeof job.createdAt === 'string' ? job.createdAt : new Date().toISOString(),
                  // Only copy safe properties, avoid spreading potentially problematic properties
                  ...('postedBy' in job && job.postedBy && typeof job.postedBy === 'object' ? { postedBy: job.postedBy } : {}),
                };
                
                // Preserve bid-related properties if they exist (safely)
                if (job && typeof job === 'object' && 'hasBid' in job) {
                  safeJob.hasBid = Boolean(job.hasBid);
                }
                if (job && typeof job === 'object' && 'bidInfo' in job && job.bidInfo && typeof job.bidInfo === 'object') {
                  const bidInfo = job.bidInfo as BidWithJob;
                  if (bidInfo.amount !== undefined) safeJob.bidAmount = bidInfo.amount;
                  if (bidInfo.status) safeJob.bidStatus = bidInfo.status;
                  if (bidInfo.created_at) safeJob.bidCreatedAt = bidInfo.created_at;
                  if (bidInfo.updated_at) safeJob.bidUpdatedAt = bidInfo.updated_at;
                }
                
                // Final safety check - ensure photos is always an array
                if (!Array.isArray(safeJob.photos)) {
                  safeJob.photos = [];
                }
                
                // Final validation before rendering
                if (!safeJob || !safeJob.id || typeof safeJob.id !== 'string' || safeJob.id.length === 0) {
                  console.warn('Invalid safeJob before render:', safeJob);
                  return null;
                }
                
                // Ensure description is always a string
                if (typeof safeJob.description !== 'string') {
                  safeJob.description = '';
                }
                
                return (
            <article
              key={safeJob.id}
              onClick={() => handleCardClick(safeJob.id)}
              style={{
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                borderRadius: '20px',
                padding: theme.spacing[5],
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[4],
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.1)`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border;
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Job Image */}
              {Array.isArray(safeJob.photos) && safeJob.photos.length > 0 ? (
                <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', backgroundColor: theme.colors.backgroundSecondary }}>
                  <Image
                    src={safeJob.photos[0] || ''}
                    alt={safeJob.title || 'Job image'}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {Array.isArray(safeJob.photos) && safeJob.photos.length > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: theme.spacing[2],
                        right: theme.spacing[2],
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                        borderRadius: '8px',
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.semibold,
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing[1],
                      }}
                    >
                      <Icon name="image" size={12} color="white" />
                      {Array.isArray(safeJob.photos) ? safeJob.photos.length : 0}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '200px',
                    borderRadius: '12px',
                    backgroundColor: theme.colors.backgroundSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px dashed ${theme.colors.border}`,
                  }}
                >
                  <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
                    <Icon name="image" size={32} color={theme.colors.textTertiary} />
                    <p style={{ margin: `${theme.spacing[2]} 0 0 0`, fontSize: theme.typography.fontSize.xs }}>
                      No images available
                    </p>
                  </div>
                </div>
              )}

              <header style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing[4] }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                    <h2
                      style={{
                        fontSize: theme.typography.fontSize.xl,
                        fontWeight: theme.typography.fontWeight.bold,
                        margin: 0,
                      }}
                    >
                      {safeJob.title}
                    </h2>
                    {'hasBid' in safeJob && safeJob.hasBid && (
                      <span
                        style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          borderRadius: '8px',
                          backgroundColor: theme.colors.success + '20',
                          color: theme.colors.success,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.semibold,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Icon name="checkCircle" size={12} color={theme.colors.success} />
                        Bid Submitted
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[3], fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name='mapPin' size={14} color={theme.colors.textSecondary} />
                      {safeJob.location || 'Location not specified'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name='briefcase' size={14} color={theme.colors.textSecondary} />
                      {safeJob.category || 'General'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name='currencyDollar' size={14} color={theme.colors.success} />
                      {safeJob.budget || 'Budget TBD'}
                    </span>
                    {'bidAmount' in safeJob && safeJob.bidAmount && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: theme.colors.primary, fontWeight: theme.typography.fontWeight.semibold }}>
                        <Icon name='currencyDollar' size={14} color={theme.colors.primary} />
                        Your bid: £{typeof safeJob.bidAmount === 'number' ? safeJob.bidAmount.toFixed(2) : safeJob.bidAmount}
                      </span>
                    )}
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
                  {safeJob.status || 'Open'}
                </span>
              </header>

              <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, lineHeight: 1.6, margin: 0 }}>
                {safeJob.description && typeof safeJob.description === 'string' && safeJob.description.length > 0
                  ? (safeJob.description.length > 220
                      ? `${safeJob.description.substring(0, 220)}...`
                      : safeJob.description)
                  : 'No description provided'}
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
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click when clicking footer
                }}
              >
                <span>
                  Posted {new Date(safeJob.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {'postedBy' in safeJob && safeJob.postedBy && ` - ${safeJob.postedBy.name}`}
                </span>
                <Button 
                  variant={'hasBid' in safeJob && safeJob.hasBid ? 'secondary' : 'primary'}
                  size='sm' 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click when clicking button
                    handleBidClick(safeJob.id);
                  }}
                >
                  {'hasBid' in safeJob && safeJob.hasBid ? 'View/Update Bid' : 'Submit bid'}
                </Button>
              </footer>
              </article>
            );
              } catch (error) {
                console.error('Error rendering job card:', error, job);
                return null;
              }
            })
            .filter((item) => item !== null); // Remove any null values from the map
          })()
        )}
      </section>
    </div>
  );
}
