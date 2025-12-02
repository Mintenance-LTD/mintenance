'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import Image from 'next/image';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, scaleIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

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
  postedBy?: { name: string };
  hasBid?: boolean;
  bidAmount?: number;
  bidStatus?: string;
  bidCreatedAt?: string;
  isStarting?: boolean;
}

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

type FilterKey = 'all' | 'recommended' | 'active';

export default function ContractorBidsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [allBids, setAllBids] = useState<BidWithJob[]>([]);
  const [startingJobs, setStartingJobs] = useState<Job[]>([]);
  const [viewedJobIds, setViewedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    document.title = 'Jobs & Bids | Mintenance';
  }, []);

  useEffect(() => {
    const loadBids = async () => {
      try {
        const response = await fetch('/api/contractor/bids');
        if (response.ok) {
          const data = await response.json();
          const bidsData = Array.isArray(data.bids) ? data.bids : [];
          setAllBids(bidsData);
        }
      } catch (error) {
        logger.error('Error loading bids', error);
      }
    };

    const loadViewedJobs = async () => {
      try {
        const response = await fetch('/api/jobs/viewed');
        if (response.ok) {
          const data = await response.json();
          const viewedIds = Array.isArray(data.jobIds) ? data.jobIds : [];
          setViewedJobIds(new Set(viewedIds));
        }
      } catch (error) {
        logger.error('Error loading viewed jobs', error);
      }
    };

    loadBids();
    loadViewedJobs();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        if (filter === 'active') {
          const response = await fetch('/api/contractor/bids');
          if (response.ok) {
            const data = await response.json();
            const bidsData = Array.isArray(data.bids) ? data.bids : [];
            setBids(bidsData);
            setAllBids(bidsData);
            setJobs([]);
          }
        } else {
          const response = await fetch(`/api/jobs?limit=20&status=posted`);
          let jobsData: Job[] = [];

          interface JobData {
            id: string;
            title?: string;
            status?: string;
            [key: string]: unknown;
          }

          if (response.ok) {
            const data = await response.json();
            jobsData = Array.isArray(data.jobs)
              ? data.jobs.filter((job: JobData) => job && typeof job === 'object' && job.id)
              : [];
          }

          setJobs(jobsData);

          const assignedResponse = await fetch(`/api/jobs?status[]=assigned&limit=50`);
          let startingJobsData: Job[] = [];

          if (assignedResponse.ok) {
            const assignedData = await assignedResponse.json();
            const assignedJobs = Array.isArray(assignedData.jobs)
              ? assignedData.jobs.filter((job: JobData) => job && typeof job === 'object' && job.id)
              : [];

            const jobsWithContracts = await Promise.all(
              assignedJobs.map(async (job: JobData) => {
                try {
                  const contractResponse = await fetch(`/api/contracts?job_id=${job.id}`);
                  if (contractResponse.ok) {
                    const contractData = await contractResponse.json();
                    const contract = contractData.contracts?.[0];
                    if (contract && (contract.status === 'accepted' || (contract.contractor_signed_at && contract.homeowner_signed_at))) {
                      return { ...job, createdAt: job.created_at || job.createdAt || new Date().toISOString() };
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
          setBids([]);
        }
      } catch (error) {
        logger.error('Error loading data', error);
        setJobs([]);
        setBids([]);
        setStartingJobs([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filter]);

  const filteredJobs = useMemo(() => {
    const safeJobs = Array.isArray(jobs) ? jobs : [];
    const safeBids = Array.isArray(bids) ? bids : [];
    const safeAllBids = Array.isArray(allBids) ? allBids : [];

    if (filter === 'active') {
      if (safeBids.length === 0) return [];
      return safeBids
        .filter((bid) => bid?.jobs && bid.jobs.id)
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
          hasBid: true,
        }));
    }

    const bidJobIds = new Set(safeAllBids.filter((bid) => bid?.jobs?.id).map((bid) => bid.jobs!.id));
    const availableJobs = safeJobs.filter((job) => {
      if (!job?.id) return false;
      const hasBid = bidJobIds.has(job.id);
      const isViewed = viewedJobIds.has(job.id);
      return !hasBid || isViewed;
    });

    if (filter === 'all') return availableJobs;

    if (filter === 'recommended') {
      const recommendedJobs: Job[] = [];
      safeAllBids.forEach((bid) => {
        if (bid?.jobs?.id) {
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

      startingJobs.forEach((job) => {
        if (!recommendedJobs.find((j) => j.id === job.id)) {
          recommendedJobs.push({ ...job, isStarting: true });
        }
      });

      return recommendedJobs;
    }

    return [];
  }, [jobs, bids, allBids, startingJobs, filter, viewedJobIds]);

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const stats = [
    { label: 'Available Jobs', value: Array.isArray(jobs) ? jobs.length : 0, icon: '💼', color: 'teal' },
    { label: 'Recommended', value: Math.min(5, Array.isArray(jobs) ? jobs.length : 0), icon: '⭐', color: 'emerald' },
    { label: 'Active Bids', value: Array.isArray(allBids) ? allBids.length : 0, icon: '📋', color: 'navy' },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">Jobs & Bids</h1>
                <p className="text-teal-100 text-lg">Browse projects and submit competitive bids</p>
              </div>
            </div>

            {/* Stats Grid */}
            <MotionDiv
              className="grid grid-cols-3 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {stats.map((stat) => (
                <MotionDiv
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-teal-100 text-sm">{stat.label}</div>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {/* Filter Tabs */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="flex items-center gap-3">
              {[
                { label: 'All Jobs', value: 'all' as FilterKey },
                { label: 'Recommended', value: 'recommended' as FilterKey },
                { label: 'Active Bids', value: 'active' as FilterKey },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    filter === tab.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </MotionDiv>

          {/* Jobs Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading jobs...</p>
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-600">Check back later for new opportunities</p>
            </div>
          ) : (
            <MotionDiv
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {filteredJobs.map((job) => (
                <MotionDiv
                  key={job.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group cursor-pointer"
                  variants={cardHover}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => router.push(`/contractor/bid/${job.id}`)}
                >
                  {/* Job Image */}
                  <div className="relative h-48 bg-gradient-to-br from-teal-100 to-emerald-100">
                    {job.photos && job.photos.length > 0 ? (
                      <Image
                        src={job.photos[0]}
                        alt={job.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-16 h-16 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {job.hasBid && (
                      <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Bid Submitted
                      </div>
                    )}
                  </div>

                  {/* Job Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">{job.title}</h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium whitespace-nowrap">
                        {job.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {job.description || 'No description provided'}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location || 'Location not specified'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {job.category || 'General'}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.budget ? `£${job.budget}` : 'Budget TBD'}
                      </div>
                      {job.bidAmount && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-teal-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Your bid: £{job.bidAmount.toFixed(2)}
                        </div>
                      )}
                    </div>

                    <button
                      className={`w-full py-3 rounded-xl font-semibold transition-all ${
                        job.hasBid
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow-md'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/contractor/bid/${job.id}`);
                      }}
                    >
                      {job.hasBid ? 'View/Update Bid' : 'Submit Bid'}
                    </button>
                  </div>
                </MotionDiv>
              ))}
            </MotionDiv>
          )}
        </div>
      </main>
    </div>
  );
}
