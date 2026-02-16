'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';
import { ContractorProfileHeader } from './components/ContractorProfileHeader';
import { ContractorPerformanceStats } from './components/ContractorPerformanceStats';
import { ContractorReviews } from './components/ContractorReviews';
import { ContractorBookingWidget } from './components/ContractorBookingWidget';
import { ContractorContactModal } from './components/ContractorContactModal';
import { ContractorPortfolio } from './components/ContractorPortfolio';

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  jobType: string;
  helpful: number;
  verified: boolean;
}

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  images: string[];
  description: string;
  completionDate: string;
  cost?: number;
  featured: boolean;
}

interface Contractor {
  id: string;
  name: string;
  company: string;
  avatar: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  yearsExperience: number;
  responseTime: string;
  acceptanceRate: number;
  location: string;
  serviceArea: string[];
  specialties: string[];
  description: string;
  phone: string;
  email: string;
  website?: string;
  verified: boolean;
  premium: boolean;
  joinDate: string;
  stats: {
    onTimeCompletion: number;
    repeatCustomers: number;
    avgProjectValue: number;
  };
}

interface RawContractorData {
  id: string;
  name?: string;
  company_name?: string;
  city?: string;
  country?: string;
  created_at?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  total_jobs_completed?: number;
  skills?: string[];
  bio?: string;
  phone?: string;
  email?: string;
  verified?: boolean;
}

function transformContractorData(contractorData: RawContractorData, id: string): Contractor {
  const location = contractorData.city && contractorData.country
    ? `${contractorData.city}, ${contractorData.country}`
    : contractorData.city || contractorData.country || 'Location not specified';

  const joinDate = contractorData.created_at ? new Date(contractorData.created_at) : new Date();
  const now = new Date();
  const yearsExperience = joinDate <= now
    ? Math.max(0, Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365)))
    : 0;

  return {
    id: contractorData.id,
    name: contractorData.name || 'Contractor',
    company: contractorData.company_name || 'Independent Contractor',
    avatar: contractorData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    coverImage: '/images/contractor-cover.jpg',
    rating: contractorData.rating || 0,
    reviewCount: contractorData.reviewCount || 0,
    completedJobs: contractorData.total_jobs_completed || 0,
    yearsExperience: yearsExperience || 0,
    responseTime: '< 24 hours',
    acceptanceRate: 0,
    location,
    serviceArea: [],
    specialties: contractorData.skills || [],
    description: (contractorData.bio &&
      !contractorData.bio.toLowerCase().includes('blalal') &&
      !contractorData.bio.toLowerCase().includes('lorem') &&
      contractorData.bio.trim().length > 10
    ) ? contractorData.bio : 'No description available.',
    phone: contractorData.phone || '',
    email: contractorData.email || '',
    website: undefined,
    verified: contractorData.verified || false,
    premium: false,
    joinDate: contractorData.created_at || new Date().toISOString(),
    stats: { onTimeCompletion: 0, repeatCustomers: 0, avgProjectValue: 0 },
  };
}

function ContractorPublicProfilePage2025() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();

  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [fetchedReviews, setFetchedReviews] = useState<Review[]>([]);
  const [fetchedPortfolio, setFetchedPortfolio] = useState<PortfolioItem[]>([]);

  const contractorId = params.id as string;

  const [returnTo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('returnTo');
    }
    return null;
  });

  const [jobId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('jobId');
    }
    return null;
  });

  const [bidId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('bidId');
    }
    return null;
  });

  const [bidAmount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const amt = new URLSearchParams(window.location.search).get('bidAmount');
      return amt ? parseFloat(amt) : 0;
    }
    return 0;
  });

  const [bidProcessing, setBidProcessing] = useState(false);

  useEffect(() => {
    const fetchContractorData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [contractorResponse, reviewsResponse, metricsResponse] = await Promise.all([
          fetch(`/api/contractors/${contractorId}`, { credentials: 'include' }),
          fetch(`/api/contractors/${contractorId}/reviews`, { credentials: 'include' }).catch(() => null),
          fetch(`/api/contractors/${contractorId}/metrics`, { credentials: 'include' }).catch(() => null),
        ]);

        if (!contractorResponse.ok) {
          throw new Error(`Failed to fetch contractor (${contractorResponse.status})`);
        }

        const contractorData = await contractorResponse.json();
        const rawContractor = contractorData.contractor as RawContractorData;
        if (!rawContractor) throw new Error('Contractor data not found in response');

        let reviews: Review[] = [];
        if (reviewsResponse && reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          reviews = reviewsData.reviews || [];
        }

        let metrics: { winRate?: number; responseTime?: string; onTimeCompletion?: number; repeatCustomers?: number; avgProjectValue?: number } = {};
        if (metricsResponse && metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          metrics = metricsData.metrics || {};
        }

        const transformed = transformContractorData(rawContractor, contractorId);
        if (metrics.onTimeCompletion !== undefined) transformed.stats.onTimeCompletion = metrics.onTimeCompletion;
        if (metrics.repeatCustomers !== undefined) transformed.stats.repeatCustomers = metrics.repeatCustomers;
        if (metrics.avgProjectValue !== undefined) transformed.stats.avgProjectValue = metrics.avgProjectValue;
        if (metrics.responseTime) transformed.responseTime = metrics.responseTime;
        if (metrics.winRate !== undefined) transformed.acceptanceRate = metrics.winRate;

        setContractor(transformed);
        if (reviews.length > 0) setFetchedReviews(reviews);
      } catch (err) {
        logger.error('Error fetching contractor:', err, { service: 'app' });
        setError(err instanceof Error ? err.message : 'Failed to load contractor profile');
        toast.error('Failed to load contractor profile');
      } finally {
        setLoading(false);
      }
    };

    if (contractorId) fetchContractorData();
  }, [contractorId]);

  const handleBack = () => {
    if (returnTo === 'job' && jobId) router.push(`/jobs/${jobId}`);
    else router.back();
  };

  const backButtonText = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('returnTo') === 'job' && urlParams.get('jobId')) return 'Back to Job';
    }
    return (returnTo === 'job' && jobId) ? 'Back to Job' : 'Back to Contractors';
  }, [returnTo, jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contractor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Profile</h2>
          <p className="text-gray-600 mb-6">{error || 'Contractor not found'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Go Back</button>
            <button
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  const response = await fetch(`/api/contractors/${contractorId}`, { credentials: 'include' });
                  if (!response.ok) throw new Error(`Failed to fetch contractor (${response.status})`);
                  const data = await response.json();
                  if (data.contractor) { setContractor(transformContractorData(data.contractor as RawContractorData, contractorId)); setError(null); }
                  else setError('Contractor data not found');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to load contractor');
                  toast.error('Failed to load contractor profile');
                } finally { setLoading(false); }
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Profile link copied to clipboard');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Profile link copied to clipboard');
      }
    } catch (err) {
      logger.error('Failed to copy to clipboard:', err, { service: 'app' });
      toast.error('Failed to copy link. Please copy the URL manually.');
    }
  };

  const navigateToMessageFlow = () => {
    if (loadingUser) { toast.loading('Loading...', { id: 'loading-user' }); return; }
    if (!user) { toast.error('Please log in to send a message'); router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; }
    if (user.role !== 'homeowner') { toast.error('Only homeowners can message contractors'); return; }
    toast('Create a job first to message this contractor');
    router.push(`/jobs/create?contractorId=${contractor.id}&action=message`);
  };

  const handleRequestQuote = () => {
    if (loadingUser) { toast.loading('Loading...', { id: 'loading-user' }); return; }
    if (!user) { toast.error('Please log in to request a quote'); router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; }
    if (user.role !== 'homeowner') { toast.error('Only homeowners can request quotes'); return; }
    if (jobId) { toast('Returning to job to request quote'); router.push(`/jobs/${jobId}`); return; }
    router.push(`/jobs/create?contractorId=${contractor.id}&action=request-quote`);
  };

  const handleAcceptBid = async () => {
    if (!bidId || !jobId) return;
    setBidProcessing(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/bids/${bidId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to accept bid');
      }
      toast.success('Bid accepted! The contractor has been notified.');
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      logger.error('Error accepting bid:', err, { service: 'ui' });
      toast.error(err instanceof Error ? err.message : 'Failed to accept bid');
      setBidProcessing(false);
    }
  };

  const handleDeclineBid = async () => {
    if (!bidId || !jobId) return;
    setBidProcessing(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/bids/${bidId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to decline bid');
      }
      toast.success('Bid declined.');
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      logger.error('Error declining bid:', err, { service: 'ui' });
      toast.error(err instanceof Error ? err.message : 'Failed to decline bid');
      setBidProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors" aria-label={backButtonText}>
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {backButtonText}
          </button>
        </div>
      </div>

      <ContractorProfileHeader
        contractor={contractor}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onShare={handleShare}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="border-b border-gray-200 pb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About {contractor.name}</h2>
              <p className="text-gray-700 leading-relaxed text-lg">{contractor.description}</p>
            </div>

            <ContractorPerformanceStats
              responseTime={contractor.responseTime}
              onTimeCompletion={contractor.stats.onTimeCompletion}
              repeatCustomers={contractor.stats.repeatCustomers}
              yearsExperience={contractor.yearsExperience}
            />

            {contractor.specialties.length > 0 && (
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Specialties</h2>
                <div className="flex flex-wrap gap-3">
                  {contractor.specialties.map((specialty, index) => (
                    <span key={index} className="px-4 py-2 bg-gray-100 text-gray-900 rounded-xl font-medium border border-gray-200">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <ContractorPortfolio portfolio={fetchedPortfolio} />

            <ContractorReviews
              rating={contractor.rating}
              reviewCount={contractor.reviewCount}
              reviews={fetchedReviews}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <ContractorBookingWidget
              rating={contractor.rating}
              reviewCount={contractor.reviewCount}
              avgProjectValue={contractor.stats.avgProjectValue}
              responseTime={contractor.responseTime}
              yearsExperience={contractor.yearsExperience}
              onRequestQuote={handleRequestQuote}
              onSendMessage={navigateToMessageFlow}
              bidContext={bidId && jobId && bidAmount ? {
                bidId,
                bidAmount,
                onAccept: handleAcceptBid,
                onDecline: handleDeclineBid,
                processing: bidProcessing,
              } : undefined}
            />
          </div>
        </div>
      </div>

      {showContactModal && (
        <ContractorContactModal
          contractorName={contractor.name}
          phone={contractor.phone}
          email={contractor.email}
          onClose={() => setShowContactModal(false)}
          onSendMessage={() => { setShowContactModal(false); navigateToMessageFlow(); }}
        />
      )}
    </div>
  );
}

export default function ContractorPublicProfilePage2025Wrapper() {
  const stableKey = 'contractor-profile-page';
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contractor profile...</p>
        </div>
      </div>
    }>
      <ContractorPublicProfilePage2025 key={stableKey} />
    </Suspense>
  );
}
