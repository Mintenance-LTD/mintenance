'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCSRF } from '@/lib/hooks/useCSRF';
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  Award,
  Briefcase,
  Users,
  Clock,
  DollarSign,
  ThumbsUp,
  MessageCircle,
  Share2,
  Heart,
  Calendar,
  Shield,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { logger } from '@mintenance/shared';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

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

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  verified: boolean;
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

function ContractorPublicProfilePage2025() {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL LOGIC OR EARLY RETURNS
  // Order is critical: all hooks must be called in the same order on every render

  // Navigation hooks - MUST be first
  const params = useParams();
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();

  // State hooks - must be called in consistent order
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reviews' | 'about'>('overview');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [fetchedReviews, setFetchedReviews] = useState<Review[]>([]);
  const [fetchedPortfolio, setFetchedPortfolio] = useState<PortfolioItem[]>([]);
  const [fetchedCertifications, setFetchedCertifications] = useState<Certification[]>([]);

  // Mock data hooks - MUST be called before useSearchParams to maintain hook order consistency
  // These are called unconditionally to maintain hook order consistency
  // Reviews will be fetched from API, use empty array as initial state
  // Mock reviews are kept as fallback for development/testing
  const mockReviews: Review[] = [];

  // Portfolio will be fetched from API, use empty array as initial state
  // Mock portfolio is kept as fallback for development/testing
  const mockPortfolio: PortfolioItem[] = [];

  // Certifications will be fetched from API, use empty array as initial state
  // Mock certifications are kept as fallback for development/testing
  const mockCertifications: Certification[] = [];

  // Extract values AFTER all hooks are declared
  const contractorId = params.id as string;
  
  // Read search params from URL immediately (client-side only)
  // Use useState initializer to read params synchronously on mount
  const [returnTo, setReturnTo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('returnTo');
    }
    return null;
  });
  
  const [jobId, setJobId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('jobId');
    }
    return null;
  });
  
  // Also update on URL changes (in case of client-side navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const newReturnTo = urlParams.get('returnTo');
      const newJobId = urlParams.get('jobId');
      
      // Update state if values changed (avoid unnecessary re-renders)
      if (newReturnTo !== returnTo) {
        setReturnTo(newReturnTo);
      }
      if (newJobId !== jobId) {
        setJobId(newJobId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, URL params are read synchronously in initializer

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

  // Transform API response to Contractor interface
  const transformContractorData = (contractorData: RawContractorData, id: string): Contractor => {
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
      location: location,
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
      stats: {
        onTimeCompletion: 0,
        repeatCustomers: 0,
        avgProjectValue: 0,
      },
    };
  };

  // Fetch real contractor data, reviews, and metrics
  useEffect(() => {
    const fetchContractorData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch contractor, reviews, and metrics in parallel
        const [contractorResponse, reviewsResponse, metricsResponse] = await Promise.all([
          fetch(`/api/contractors/${contractorId}`, { credentials: 'include' }),
          fetch(`/api/contractors/${contractorId}/reviews`, { credentials: 'include' }).catch(() => null),
          fetch(`/api/contractors/${contractorId}/metrics`, { credentials: 'include' }).catch(() => null),
        ]);

        if (!contractorResponse.ok) {
          const errorMessage = `Failed to fetch contractor (${contractorResponse.status})`;
          throw new Error(errorMessage);
        }

        const contractorData = await contractorResponse.json();
        const contractor = contractorData.contractor as RawContractorData;

        if (!contractor) {
          throw new Error('Contractor data not found in response');
        }

        // Fetch reviews if API available
        let fetchedReviews: Review[] = [];
        if (reviewsResponse && reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          fetchedReviews = reviewsData.reviews || [];
        }

        // Fetch metrics if API available
        let fetchedMetrics: {
          winRate?: number;
          totalBids?: number;
          avgRating?: number;
          earnings?: number;
          onTimeCompletion?: number;
          repeatCustomers?: number;
          avgProjectValue?: number;
          responseTime?: string;
        } = {};
        if (metricsResponse && metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          fetchedMetrics = metricsData.metrics || {};
        }

        // Transform contractor data with metrics
        const transformedContractor = transformContractorData(contractor, contractorId);
        
        // Update contractor with metrics
        if (fetchedMetrics.onTimeCompletion !== undefined) {
          transformedContractor.stats.onTimeCompletion = fetchedMetrics.onTimeCompletion;
        }
        if (fetchedMetrics.repeatCustomers !== undefined) {
          transformedContractor.stats.repeatCustomers = fetchedMetrics.repeatCustomers;
        }
        if (fetchedMetrics.avgProjectValue !== undefined) {
          transformedContractor.stats.avgProjectValue = fetchedMetrics.avgProjectValue;
        }
        if (fetchedMetrics.responseTime) {
          transformedContractor.responseTime = fetchedMetrics.responseTime;
        }
        if (fetchedMetrics.winRate !== undefined) {
          transformedContractor.acceptanceRate = fetchedMetrics.winRate;
        }

        setContractor(transformedContractor);

        // Update reviews state with fetched reviews
        if (fetchedReviews.length > 0) {
          setFetchedReviews(fetchedReviews);
        }
      } catch (error) {
        logger.error('Error fetching contractor:', error, { service: 'app' });
        const errorMessage = error instanceof Error ? error.message : 'Failed to load contractor profile';
        setError(errorMessage);
        toast.error('Failed to load contractor profile');
      } finally {
        setLoading(false);
      }
    };

    if (contractorId) {
      fetchContractorData();
    }
  }, [contractorId]);

  // Handle back navigation based on return context
  const handleBack = () => {
    if (returnTo === 'job' && jobId) {
      // Use router.push with replace to avoid adding to history stack
      // This should preserve authentication state better than window.location
      router.push(`/jobs/${jobId}`);
    } else {
      // Use router.back() for browser history navigation
      router.back();
    }
  };

  // Determine back button text based on URL params
  // Read directly from URL to ensure we get the latest values
  const backButtonText = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlReturnTo = urlParams.get('returnTo');
      const urlJobId = urlParams.get('jobId');
      if (urlReturnTo === 'job' && urlJobId) {
        return 'Back to Job';
      }
    }
    // Fallback to state values if window not available
    return (returnTo === 'job' && jobId) ? 'Back to Job' : 'Back to Contractors';
  }, [returnTo, jobId]);

  // Early return for loading state - MUST be after all hooks
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

  // Error state
  if (error || !contractor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Profile</h2>
          <p className="text-gray-600 mb-6">{error || 'Contractor not found'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  const response = await fetch(`/api/contractors/${contractorId}`, {
                    credentials: 'include',
                  });
                  if (!response.ok) {
                    throw new Error(`Failed to fetch contractor (${response.status})`);
                  }
                  const data = await response.json();
                  if (data.contractor) {
                    setContractor(transformContractorData(data.contractor as RawContractorData, contractorId));
                    setError(null);
                  } else {
                    setError('Contractor data not found');
                  }
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to load contractor';
                  setError(errorMessage);
                  toast.error('Failed to load contractor profile');
                } finally {
                  setLoading(false);
                }
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Try Again
            </button>
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
        // Fallback for browsers that don't support clipboard API
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
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error, { service: 'app' });
      toast.error('Failed to copy link. Please copy the URL manually.');
    }
  };

  const handleContact = () => {
    setShowContactModal(true);
  };

  const handleRequestQuote = async () => {
    // Wait for user data to load
    if (loadingUser) {
      toast.loading('Loading...', { id: 'loading-user' });
      return;
    }

    // Check if user is logged in (only after loading is complete)
    if (!user) {
      toast.error('Please log in to request a quote');
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Check if user is a homeowner
    if (user.role !== 'homeowner') {
      toast.error('Only homeowners can request quotes');
      return;
    }

    // If we have a jobId (user came from job detail page), navigate back to that job
    // where they can request a quote for the existing job
    if (jobId) {
      toast.info('Returning to job to request quote');
      router.push(`/jobs/${jobId}`);
      return;
    }

    // If no jobId, navigate to job creation with contractor pre-selected
    // This is for when user is browsing contractors without a specific job context
    router.push(`/jobs/create?contractorId=${contractor.id}&action=request-quote`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            aria-label={backButtonText}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {backButtonText}
          </button>
        </div>
      </div>

      {/* Airbnb-style Header: Cover + Profile Photo Overlap */}
      <div className="relative">
        {/* Cover Image */}
        <div className="relative h-96 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600">
          <div className="absolute inset-0 bg-black bg-opacity-10" />
        </div>

        {/* Profile Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Profile Photo - Overlapping Cover */}
            <div className="absolute -top-24 left-0">
              <div className="relative w-48 h-48 rounded-3xl border-6 border-white shadow-2xl bg-white overflow-hidden">
                <Image
                  src={contractor.avatar}
                  alt={contractor.name}
                  fill
                  className="object-cover rounded-3xl"
                  sizes="192px"
                  unoptimized={contractor.avatar.startsWith('http') && !contractor.avatar.includes('dicebear.com')}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${contractor.id}`;
                  }}
                />
                {contractor.verified && (
                  <div className="absolute bottom-3 right-3 bg-teal-600 rounded-full p-3 border-4 border-white shadow-lg z-10">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="pt-32 pb-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Name & Premium Badge */}
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold text-gray-900">{contractor.name}</h1>
                    {contractor.premium && (
                      <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-sm font-bold rounded-full shadow-md">
                        PRO
                      </span>
                    )}
                  </div>

                  {/* Company Name */}
                  <p className="text-xl text-gray-700 mb-4">{contractor.company}</p>

                  {/* Stats Bar - Airbnb Style */}
                  <div className="flex items-center gap-4 flex-wrap mb-6">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 fill-gray-900 text-gray-900" />
                      <span className="text-lg font-semibold text-gray-900">
                        {contractor.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-gray-400">·</span>
                    <button className="font-semibold text-gray-900 underline hover:text-gray-700">
                      {contractor.reviewCount} reviews
                    </button>
                    <span className="text-gray-400">·</span>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Briefcase className="w-5 h-5" />
                      <span className="font-semibold">{contractor.completedJobs}</span>
                      <span>jobs</span>
                    </div>
                    <span className="text-gray-400">·</span>
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-5 h-5" />
                      <span>{contractor.location}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium shadow-sm"
                    aria-label="Share contractor profile"
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                    Share
                  </button>
                  <button
                    onClick={handleToggleFavorite}
                    className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-medium shadow-sm ${
                      isFavorite
                        ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* About Section */}
            <div className="border-b border-gray-200 pb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About {contractor.name}</h2>
              <p className="text-gray-700 leading-relaxed text-lg">{contractor.description}</p>
            </div>

            {/* Stats Grid */}
            <div className="border-b border-gray-200 pb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Performance</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-600">Response time</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{contractor.responseTime}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-600">On-time completion</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{contractor.stats.onTimeCompletion}%</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-600">Repeat customers</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{contractor.stats.repeatCustomers}%</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-600">Years experience</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{contractor.yearsExperience}</p>
                </div>
              </div>
            </div>

            {/* Specialties */}
            {contractor.specialties.length > 0 && (
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Specialties</h2>
                <div className="flex flex-wrap gap-3">
                  {contractor.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-gray-100 text-gray-900 rounded-xl font-medium border border-gray-200"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio - Masonry Grid */}
            {fetchedPortfolio.length > 0 && (
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Portfolio</h2>
                <div className="grid grid-cols-2 gap-4">
                  {fetchedPortfolio.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {item.images && item.images.length > 0 && item.images[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const placeholder = parent.querySelector('.placeholder-fallback');
                              if (placeholder) {
                                (placeholder as HTMLElement).style.display = 'flex';
                              }
                            }
                          }}
                        />
                      ) : null}
                      <div className="placeholder-fallback absolute inset-0 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center" style={{ display: item.images && item.images.length > 0 && item.images[0] ? 'none' : 'flex' }}>
                        <ImageIcon className="w-16 h-16 text-gray-300" />
                      </div>
                      {item.featured && (
                        <span className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded-full shadow-lg">
                          Featured
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                      <h4 className="font-semibold text-white text-lg">{item.title}</h4>
                      <p className="text-white/90 text-sm">{item.category}</p>
                    </div>
                  </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  <Star className="w-6 h-6 fill-gray-900 text-gray-900 inline mr-2" />
                  {contractor.rating.toFixed(1)} · {fetchedReviews.length > 0 ? fetchedReviews.length : contractor.reviewCount} {fetchedReviews.length > 0 ? fetchedReviews.length === 1 ? 'review' : 'reviews' : contractor.reviewCount === 1 ? 'review' : 'reviews'}
                </h2>
              </div>
              {fetchedReviews.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {fetchedReviews.map((review) => (
                  <div key={review.id} className="pb-6 border-b border-gray-200 last:border-0">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold">{review.author.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{review.author}</h4>
                            <p className="text-sm text-gray-500">
                              {new Date(review.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating ? 'fill-gray-900 text-gray-900' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-gray-200 rounded-xl bg-gray-50">
                  <p className="text-gray-600">No reviews yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sticky Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white border border-gray-300 rounded-3xl p-6 shadow-xl">
                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {contractor.stats.avgProjectValue > 0 
                        ? `£${contractor.stats.avgProjectValue.toLocaleString()}`
                        : 'N/A'}
                    </span>
                    {contractor.stats.avgProjectValue > 0 && (
                      <span className="text-gray-600">avg project</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-gray-900 text-gray-900" />
                    <span className="font-semibold text-gray-900">{contractor.rating.toFixed(1)}</span>
                    <span className="text-gray-600">({contractor.reviewCount} reviews)</span>
                  </div>
                </div>

                <button
                  onClick={handleRequestQuote}
                  className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all mb-4"
                >
                  Request Quote
                </button>

                <button
                  onClick={() => {
                    // Wait for user data to load
                    if (loadingUser) {
                      toast.loading('Loading...', { id: 'loading-user' });
                      return;
                    }

                    // Check if user is logged in (only after loading is complete)
                    if (!user) {
                      toast.error('Please log in to send a message');
                      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                      return;
                    }

                    // Check if user is a homeowner
                    if (user.role !== 'homeowner') {
                      toast.error('Only homeowners can message contractors');
                      return;
                    }

                    // Messages require a jobId. Navigate to job creation first,
                    // then user can message through the job after creating it
                    toast.info('Create a job first to message this contractor');
                    router.push(`/jobs/create?contractorId=${contractor.id}&action=message`);
                  }}
                  className="w-full py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Send Message
                </button>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-center text-sm text-gray-600 mb-3">Quick facts</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Responds in {contractor.responseTime}</p>
                        <p className="text-xs text-gray-500">Usually replies quickly</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-teal-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Verified contractor</p>
                        <p className="text-xs text-gray-500">ID and credentials checked</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-yellow-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {contractor.yearsExperience > 0 
                            ? `${contractor.yearsExperience} ${contractor.yearsExperience === 1 ? 'year' : 'years'} experience`
                            : 'New contractor'}
                        </p>
                        {contractor.yearsExperience > 0 && (
                          <p className="text-xs text-gray-500">
                            Established since {new Date().getFullYear() - contractor.yearsExperience}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contact {contractor.name}</h3>

            <div className="space-y-4 mb-6">
              {contractor.phone && (
                <a
                  href={`tel:${contractor.phone}`}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{contractor.phone}</p>
                  </div>
                </a>
              )}

              {contractor.email && (
                <a
                  href={`mailto:${contractor.email}`}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Mail className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{contractor.email}</p>
                  </div>
                </a>
              )}

              {!contractor.phone && !contractor.email && (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Contact information not available</p>
                </div>
              )}

              <button
                onClick={() => {
                  setShowContactModal(false);
                  
                  // Wait for user data to load
                  if (loadingUser) {
                    toast.loading('Loading...', { id: 'loading-user' });
                    return;
                  }

                  // Check if user is logged in (only after loading is complete)
                  if (!user) {
                    toast.error('Please log in to send a message');
                    router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                    return;
                  }

                  // Check if user is a homeowner
                  if (user.role !== 'homeowner') {
                    toast.error('Only homeowners can message contractors');
                    return;
                  }

                  // Messages require a jobId. Navigate to job creation first,
                  // then user can message through the job after creating it
                  toast.info('Create a job first to message this contractor');
                  router.push(`/jobs/create?contractorId=${contractor.id}&action=message`);
                }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-teal-600" />
                <div className="text-left">
                  <p className="text-sm text-gray-600">Message</p>
                  <p className="font-medium text-gray-900">Send a message</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function ContractorPublicProfilePage2025Wrapper() {
  // Use a stable key to help React reconcile the component tree properly
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
