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
  hasBid?: boolean;
  bidAmount?: number;
  bidStatus?: string;
  bidCreatedAt?: string;
  isStarting?: boolean;
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
  const [startingJobs, setStartingJobs] = useState<Job[]>([]); // Jobs with accepted contracts
  const [viewedJobIds, setViewedJobIds] = useState<Set<string>>(new Set()); // Jobs the contractor has viewed
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('available');

  useEffect(() => {
    document.title = 'Jobs & Bids | Mintenance';
  }, []);

  // Fetch bids and viewed jobs separately to check against jobs
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

    const loadViewedJobs = async () => {
      try {
        // Fetch jobs the contractor has viewed
        const response = await fetch('/api/jobs/viewed');
        if (response.ok) {
          const data = await response.json();
          const viewedIds = Array.isArray(data.jobIds) ? data.jobIds : [];
          console.log('[ContractorBidsPage] Loaded viewed job IDs:', viewedIds);
          setViewedJobIds(new Set(viewedIds));
        } else {
          const errorText = await response.text();
          console.error('Error loading viewed jobs:', response.status, errorText);
          setViewedJobIds(new Set());
        }
      } catch (error) {
        console.error('Error loading viewed jobs:', error);
        setViewedJobIds(new Set());
      }
    };

    loadBids();
    loadViewedJobs();

    // Refresh bids and viewed jobs when page becomes visible (e.g., after returning from bid submission)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBids();
        loadViewedJobs();
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
          let jobsData: Job[] = [];
          
          if (response.ok) {
            const data = await response.json();
            // Ensure we always set an array, and filter out any invalid job objects
            jobsData = Array.isArray(data.jobs) 
              ? data.jobs.filter((job: any) => job && typeof job === 'object' && job.id)
              : [];
          }
          
          // Also fetch viewed jobs that might not be in "posted" status
          // This ensures viewed jobs appear even if their status changed
          const viewedJobsResponse = await fetch('/api/jobs/viewed');
          if (viewedJobsResponse.ok) {
            const viewedData = await viewedJobsResponse.json();
            const viewedJobIds = Array.isArray(viewedData.jobIds) ? viewedData.jobIds : [];
            
            if (viewedJobIds.length > 0) {
              // Fetch each viewed job by ID (they might have different statuses)
              // Note: This will only fetch jobs the contractor is authorized to view
              const viewedJobsPromises = viewedJobIds.map(async (jobId: string) => {
                try {
                  const jobResponse = await fetch(`/api/jobs/${jobId}`);
                  if (jobResponse.ok) {
                    const jobData = await jobResponse.json();
                    const job = jobData.job;
                    // Transform JobDetail to Job format
                    if (job) {
                      return {
                        id: job.id,
                        title: job.title,
                        description: job.description,
                        status: job.status,
                        createdAt: job.createdAt || job.created_at,
                        // Add other fields as needed
                      } as Job;
                    }
                  }
                  return null;
                } catch (error) {
                  console.warn(`Failed to fetch viewed job ${jobId}:`, error);
                  return null;
                }
              });
              
              const viewedJobs = (await Promise.all(viewedJobsPromises))
                .filter((job): job is Job => job !== null && typeof job === 'object' && !!job.id);
              
              // Merge viewed jobs with posted jobs, avoiding duplicates
              const existingJobIds = new Set(jobsData.map(j => j.id));
              viewedJobs.forEach(viewedJob => {
                if (!existingJobIds.has(viewedJob.id)) {
                  jobsData.push(viewedJob);
                }
              });
              
              console.log(`[ContractorBidsPage] Merged ${viewedJobs.length} viewed jobs into jobs list`);
            }
          }
          
          setJobs(jobsData);
          
          // Fetch assigned jobs with accepted contracts for "Recommended" tab
          const assignedResponse = await fetch(`/api/jobs?status[]=assigned&limit=50`);
          let startingJobsData: Job[] = [];
          
          if (assignedResponse.ok) {
            const assignedData = await assignedResponse.json();
            const assignedJobs = Array.isArray(assignedData.jobs) 
              ? assignedData.jobs.filter((job: any) => job && typeof job === 'object' && job.id)
              : [];
            
            // Filter to only include jobs with accepted contracts
            const jobsWithContracts = await Promise.all(
              assignedJobs.map(async (job: any) => {
                try {
                  const contractResponse = await fetch(`/api/contracts?job_id=${job.id}`);
                  if (contractResponse.ok) {
                    const contractData = await contractResponse.json();
                    const contract = contractData.contracts?.[0];
                    // Only include if contract is accepted or both parties have signed
                    if (contract && (contract.status === 'accepted' || (contract.contractor_signed_at && contract.homeowner_signed_at))) {
                      return {
                        ...job,
                        createdAt: job.created_at || job.createdAt || new Date().toISOString(),
                      };
                    }
                  }
                  return null;
                } catch {
                  return null;
                }
              })
            );
            
            startingJobsData = jobsWithContracts.filter((job): job is Job => job !== null);
          }
          
          setStartingJobs(startingJobsData);
          setBids([]); // Clear bids when showing jobs
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setJobs([]); // Ensure we always have an array, even on error
        setBids([]);
        setStartingJobs([]);
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
      
      // Double-check all are arrays (defensive programming)
      if (!Array.isArray(safeJobs) || !Array.isArray(safeBids) || !Array.isArray(safeAllBids)) {
        console.warn('Invalid input arrays in filteredJobs useMemo', { 
          jobs: typeof jobs, 
          bids: typeof bids, 
          allBids: typeof allBids 
        });
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
      
      // For "available" tab: show jobs that haven't been bid on OR jobs that have been viewed
      // This ensures viewed jobs appear even if they have bids
      const safeViewedJobIds = viewedJobIds instanceof Set ? viewedJobIds : new Set<string>();
      const availableJobs = safeJobs.filter((job) => {
        if (!job || typeof job !== 'object') return false;
        if (!job.id || typeof job.id !== 'string') return false;
        
        const hasBid = bidJobIds.has(job.id);
        const isViewed = safeViewedJobIds.has(job.id);
        const shouldInclude = !hasBid || isViewed;
        
        // Debug logging
        if (process.env.NODE_ENV === 'development' && isViewed) {
          console.log(`[Filter] Job ${job.id} (${job.title}): hasBid=${hasBid}, isViewed=${isViewed}, include=${shouldInclude}`);
        }
        
        // Include if: no bid OR contractor has viewed it
        return shouldInclude;
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Filter] Available jobs: ${availableJobs.length} out of ${safeJobs.length} total jobs`, {
          totalJobs: safeJobs.length,
          jobsWithBids: Array.from(bidJobIds).length,
          viewedJobs: safeViewedJobIds.size,
          availableJobs: availableJobs.length,
        });
      }
      
      if (filter === 'available') {
        return Array.isArray(availableJobs) ? availableJobs : [];
      }
      
      if (filter === 'recommended') {
        // "Recommended" should show:
        // 1. Jobs where contractor has made a bid
        // 2. Jobs with accepted contracts (starting jobs)
        const recommendedJobs: Job[] = [];
        
        // Add jobs with bids (convert bids to job format)
        safeAllBids.forEach((bid) => {
          if (bid?.jobs && typeof bid.jobs === 'object' && bid.jobs.id) {
            recommendedJobs.push({
              id: bid.jobs.id,
              title: bid.jobs.title || 'Untitled Job',
              description: bid.jobs.description,
              budget: bid.jobs.budget,
              location: bid.jobs.location,
              category: bid.jobs.category,
              status: bid.jobs.status,
              createdAt: bid.jobs.created_at || bid.created_at,
              photos: Array.isArray(bid.jobs.photos) ? bid.jobs.photos : [],
              hasBid: true,
              bidAmount: bid.amount,
              bidStatus: bid.status,
            });
          }
        });
        
        // Add starting jobs (assigned jobs with accepted contracts)
        const safeStartingJobs = Array.isArray(startingJobs) ? startingJobs : [];
        safeStartingJobs.forEach((job) => {
          // Avoid duplicates if a job already appears from bids
          if (!recommendedJobs.find((j) => j.id === job.id)) {
            recommendedJobs.push({
              ...job,
              isStarting: true, // Mark as starting job
            });
          }
        });
        
        // Sort by most recent (bids by updated_at, starting jobs by job updated_at)
        recommendedJobs.sort((a, b) => {
          const aDate = a.bidCreatedAt || a.createdAt || '';
          const bDate = b.bidCreatedAt || b.createdAt || '';
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        
        return recommendedJobs;
      }
      
      return [];
    } catch (error) {
      console.error('Error computing filteredJobs:', error);
      return [];
    }
  }, [jobs, bids, allBids, startingJobs, filter, viewedJobIds]);

  // Ensure jobs is always an array for summary cards
  const safeJobsArray = Array.isArray(jobs) ? jobs : [];
  const safeBidsArray = Array.isArray(bids) ? bids : [];
  const safeAllBidsArray = Array.isArray(allBids) ? allBids : [];
  
  // Defensive check: ensure all arrays are valid before accessing length
  const jobsLength = Array.isArray(safeJobsArray) ? safeJobsArray.length : 0;
  const allBidsLength = Array.isArray(safeAllBidsArray) ? safeAllBidsArray.length : 0;
  
  // Ensure all values are numbers before creating summaryCards
  const safeJobsLength = typeof jobsLength === 'number' ? jobsLength : 0;
  const safeAllBidsLength = typeof allBidsLength === 'number' ? allBidsLength : 0;
  
  const summaryCards = [
    { label: 'Jobs available', value: safeJobsLength },
    { label: 'Recommended for you', value: Math.min(5, safeJobsLength) },
    { label: 'Saved bids', value: safeAllBidsLength }, // Use allBids instead of bids to show count regardless of filter
  ];
  
  // Ensure summaryCards is always an array
  const safeSummaryCards = Array.isArray(summaryCards) ? summaryCards : [];

  const handleBidClick = (jobId: string) => {
    router.push(`/contractor/bid/${jobId}`);
  };

  const handleCardClick = (jobId: string) => {
    router.push(`/contractor/bid/${jobId}`);
  };

  // Safety check for theme
  if (!theme || !theme.colors || !theme.spacing || !theme.typography) {
    console.error('Theme is not properly initialized');
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <header>
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
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        {safeSummaryCards.map((card) => (
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
        ) : (() => {
          // Defensive check: ensure filteredJobs is always an array
          // Handle case where filteredJobs might be undefined from useMemo
          if (filteredJobs === undefined || filteredJobs === null) {
            return true; // Show empty state if undefined
          }
          const safeFilteredJobs = Array.isArray(filteredJobs) ? filteredJobs : [];
          // Ensure length is accessible
          const jobsLength = safeFilteredJobs && typeof safeFilteredJobs.length === 'number' ? safeFilteredJobs.length : 0;
          return jobsLength === 0;
        })() ? (
          <div
            style={{
              textAlign: 'center',
              padding: `${theme.spacing[12] || '48px'} 0`,
              color: theme.colors.textSecondary,
              borderRadius: '20px',
              border: `1px dashed ${theme.colors.border}`,
              backgroundColor: theme.colors.backgroundSecondary,
            }}
          >
            <div style={{ marginBottom: theme.spacing[4], display: 'flex', justifyContent: 'center' }}>
              <Icon name='briefcase' size={48} color={theme.colors.textTertiary || theme.colors.textSecondary || '#6B7280'} />
            </div>
            <h3 style={{ fontSize: theme.typography.fontSize.xl, marginBottom: theme.spacing[2], color: theme.colors.textPrimary }}>
              No jobs in this view yet
            </h3>
            <p>Check back later or adjust your filters to discover more opportunities.</p>
          </div>
        ) : (
          (() => {
            // Ensure filteredJobs is always an array before processing
            // Handle case where filteredJobs might be undefined from useMemo
            if (filteredJobs === undefined || filteredJobs === null) {
              return [];
            }
            const safeFilteredJobs = Array.isArray(filteredJobs) ? filteredJobs : [];
            // Double-check array validity and length accessibility
            if (!Array.isArray(safeFilteredJobs) || 
                safeFilteredJobs === null || 
                safeFilteredJobs === undefined ||
                typeof safeFilteredJobs.length !== 'number' ||
                safeFilteredJobs.length === 0) {
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
                
                // Ensure photos array is valid
                if (safeJob.photos === null || safeJob.photos === undefined) {
                  safeJob.photos = [];
                }
                
                // Final validation before rendering
                if (!safeJob || !safeJob.id || typeof safeJob.id !== 'string' || (safeJob.id && safeJob.id.length === 0)) {
                  console.warn('Invalid safeJob before render:', safeJob);
                  return null;
                }
                
                // Ensure description is always a string
                if (typeof safeJob.description !== 'string') {
                  safeJob.description = '';
                }
                
                // Double-check photos before rendering
                if (!safeJob.photos || !Array.isArray(safeJob.photos)) {
                  safeJob.photos = [];
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
              {safeJob.photos && Array.isArray(safeJob.photos) && safeJob.photos.length > 0 && safeJob.photos[0] ? (
                <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', backgroundColor: theme.colors.backgroundSecondary }}>
                  <Image
                    src={safeJob.photos[0] || ''}
                    alt={safeJob.title || 'Job image'}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {safeJob.photos && Array.isArray(safeJob.photos) && safeJob.photos.length > 1 && (
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
                      {safeJob.photos && Array.isArray(safeJob.photos) ? safeJob.photos.length : 0}
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
                      <Icon name='currencyPound' size={14} color={theme.colors.success} />
                      {safeJob.budget || 'Budget TBD'}
                    </span>
                    {'bidAmount' in safeJob && safeJob.bidAmount && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: theme.colors.primary, fontWeight: theme.typography.fontWeight.semibold }}>
                        <Icon name='currencyPound' size={14} color={theme.colors.primary} />
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
