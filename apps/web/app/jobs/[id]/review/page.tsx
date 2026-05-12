'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Star,
  Send,
  CheckCircle,
  Briefcase,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { fetchCurrentUser } from '@/lib/auth-client';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { MintEditorialJobReview } from './MintEditorialJobReview';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface JobData {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  budget: number;
  contractor_id: string | null;
  contractor?: {
    id: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    profile_image_url?: string;
  };
}

interface ReviewFormData {
  overallRating: number;
  comment: string;
  wouldRecommend: boolean | null;
}

export default function ReviewSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { csrfToken } = useCSRF();

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ReviewFormData>({
    overallRating: 0,
    comment: '',
    wouldRecommend: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Mint Editorial theme detection — swap the legacy split-flow page
  // for the unified MintEditorialJobReview surface (approve + rate +
  // tip + release in one pass) from W5 of the canonical audit.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  // Fetch real job data
  useEffect(() => {
    async function loadJob() {
      try {
        setLoading(true);
        const currentUser = await fetchCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }

        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          setError('Failed to load job details');
          return;
        }

        const data = await res.json();
        const jobData = data.job || data;

        if (jobData.status !== 'completed') {
          setError('Reviews can only be submitted for completed jobs');
          return;
        }

        // Fetch contractor profile if we have a contractor_id
        let contractor = undefined;
        if (jobData.contractor_id) {
          const profileRes = await fetch(
            `/api/contractors/${jobData.contractor_id}`
          );
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            contractor = profileData.contractor || profileData;
          }
        }

        setJob({
          id: jobData.id,
          title: jobData.title || 'Untitled Job',
          status: jobData.status,
          completed_at: jobData.completed_at,
          budget: jobData.budget || 0,
          contractor_id: jobData.contractor_id,
          contractor: contractor
            ? {
                id: contractor.id,
                first_name: contractor.first_name || '',
                last_name: contractor.last_name || '',
                company_name: contractor.company_name,
                profile_image_url: contractor.profile_image_url,
              }
            : undefined,
        });
      } catch (err) {
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    }

    if (jobId) loadJob();
  }, [jobId, router]);

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, overallRating: rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.overallRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!formData.comment.trim() || formData.comment.trim().length < 20) {
      toast.error('Please write a review (minimum 20 characters)');
      return;
    }

    if (formData.wouldRecommend === null) {
      toast.error('Please indicate if you would recommend this contractor');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/jobs/${jobId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          rating: formData.overallRating,
          comment: formData.comment.trim(),
          wouldRecommend: formData.wouldRecommend,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit review'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p className='text-gray-600'>Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center max-w-md'>
          <p className='text-red-600 mb-4'>{error || 'Job not found'}</p>
          <button
            onClick={() => router.back()}
            className='text-teal-600 hover:text-teal-700 font-medium'
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const contractorName = job.contractor
    ? `${job.contractor.first_name} ${job.contractor.last_name}`.trim() ||
      'Contractor'
    : 'Contractor';

  const contractorAvatar = job.contractor?.profile_image_url;

  // Mint Editorial branch — single unified surface (approve + rate +
  // tip + release). Falls through to the legacy stars-only flow below
  // for default-theme users.
  if (isMintEditorial) {
    return (
      <HomeownerPageWrapper>
        <MintEditorialJobReview job={job} />
      </HomeownerPageWrapper>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        className='bg-white border-b border-gray-200'
      >
        <div className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors'
          >
            <ArrowLeft className='w-5 h-5' />
            Back
          </button>

          <div className='flex items-center gap-4'>
            {contractorAvatar ? (
              <Image
                src={contractorAvatar}
                alt={contractorName}
                width={64}
                height={64}
                className='rounded-full border-2 border-gray-200 object-cover'
              />
            ) : (
              <div className='w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center border-2 border-gray-200'>
                <span className='text-white font-bold text-xl'>
                  {contractorName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className='text-2xl font-bold text-gray-900 mb-1'>
                Review {contractorName}
              </h1>
              <div className='flex items-center gap-2 text-sm text-gray-600'>
                <Briefcase className='w-4 h-4' />
                <span>{job.title}</span>
              </div>
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Rating Section */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-white rounded-2xl p-8 shadow-sm border border-gray-200'
          >
            <h2 className='text-xl font-semibold text-gray-900 mb-6'>
              How was your experience?
            </h2>

            <div className='flex flex-col items-center py-4'>
              <div className='flex items-center gap-3 mb-4'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type='button'
                    onClick={() => handleRatingChange(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className='transition-all duration-200 hover:scale-110'
                  >
                    <Star
                      className={`w-14 h-14 transition-all ${
                        star <= (hoveredStar || formData.overallRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <p className='text-lg font-medium text-gray-700'>
                {formData.overallRating === 0 && 'Select a rating'}
                {formData.overallRating > 0 &&
                  ratingLabels[formData.overallRating]}
              </p>
            </div>
          </MotionDiv>

          {/* Written Review */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='bg-white rounded-2xl p-8 shadow-sm border border-gray-200'
          >
            <h2 className='text-xl font-semibold text-gray-900 mb-2'>
              Share your experience
            </h2>
            <p className='text-sm text-gray-600 mb-4'>
              Tell others about the quality, communication, and professionalism
            </p>

            <textarea
              value={formData.comment}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, comment: e.target.value }))
              }
              rows={6}
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none'
              placeholder='What went well? What could have been better?'
            />
            <div className='flex justify-between items-center mt-2'>
              <p className='text-sm text-gray-500'>
                {formData.comment.length} characters (minimum 20)
              </p>
              <p
                className={`text-sm font-medium ${formData.comment.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}
              >
                {formData.comment.length >= 20 ? (
                  <CheckCircle className='w-5 h-5 inline' />
                ) : null}
              </p>
            </div>
          </MotionDiv>

          {/* Recommendation */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='bg-white rounded-2xl p-8 shadow-sm border border-gray-200'
          >
            <h2 className='text-xl font-semibold text-gray-900 mb-6'>
              Would you recommend this contractor?
            </h2>

            <div className='grid grid-cols-2 gap-4'>
              <MotionButton
                type='button'
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, wouldRecommend: true }))
                }
                className={`flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 transition-all ${
                  formData.wouldRecommend === true
                    ? 'border-teal-600 bg-teal-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <ThumbsUp
                  className={`w-8 h-8 ${formData.wouldRecommend === true ? 'text-teal-600' : 'text-gray-400'}`}
                />
                <span
                  className={`font-semibold ${formData.wouldRecommend === true ? 'text-teal-900' : 'text-gray-700'}`}
                >
                  Yes
                </span>
              </MotionButton>

              <MotionButton
                type='button'
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, wouldRecommend: false }))
                }
                className={`flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 transition-all ${
                  formData.wouldRecommend === false
                    ? 'border-red-600 bg-red-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <ThumbsDown
                  className={`w-8 h-8 ${formData.wouldRecommend === false ? 'text-red-600' : 'text-gray-400'}`}
                />
                <span
                  className={`font-semibold ${formData.wouldRecommend === false ? 'text-red-900' : 'text-gray-700'}`}
                >
                  No
                </span>
              </MotionButton>
            </div>
          </MotionDiv>

          {/* Submit Button */}
          <div className='flex gap-4 justify-end pt-4'>
            <button
              type='button'
              onClick={() => router.back()}
              className='px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium'
            >
              Cancel
            </button>
            <MotionButton
              type='submit'
              disabled={isSubmitting}
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              className='px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isSubmitting ? (
                <>
                  <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className='w-5 h-5' />
                  Submit review
                </>
              )}
            </MotionButton>
          </div>
        </form>
      </div>
    </div>
  );
}
