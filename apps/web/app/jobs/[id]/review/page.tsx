'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Send,
  CheckCircle,
  User,
  Briefcase,
  Clock,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

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

interface ReviewFormData {
  overallRating: number;
  categoryRatings: {
    quality: number;
    communication: number;
    timeliness: number;
    professionalism: number;
  };
  title: string;
  comment: string;
  wouldRecommend: boolean | null;
  completedOnTime: boolean | null;
  stayedWithinBudget: boolean | null;
  images: string[];
}

export default function ReviewSubmissionPage2025() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  // Mock job and contractor data
  const job = {
    id: jobId,
    title: 'Kitchen Renovation',
    contractor: {
      id: 'contractor_456',
      name: 'John Smith',
      company: 'Smith Construction Ltd',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=contractor1',
    },
    completedDate: '2025-01-28',
    finalCost: 14500,
  };

  const [formData, setFormData] = useState<ReviewFormData>({
    overallRating: 0,
    categoryRatings: {
      quality: 0,
      communication: 0,
      timeliness: 0,
      professionalism: 0,
    },
    title: '',
    comment: '',
    wouldRecommend: null,
    completedOnTime: null,
    stayedWithinBudget: null,
    images: [],
  });

  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryLabels = {
    quality: 'Quality of Work',
    communication: 'Communication',
    timeliness: 'Timeliness',
    professionalism: 'Professionalism',
  };

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, overallRating: rating }));
  };

  const handleCategoryRatingChange = (
    category: keyof ReviewFormData['categoryRatings'],
    rating: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      categoryRatings: {
        ...prev.categoryRatings,
        [category]: rating,
      },
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newImages = Array.from(files).map((file) => `/uploads/${file.name}`);

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));

    setUploadingImages(false);
    toast.success(`${files.length} image(s) uploaded`);
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a review title');
      return;
    }

    if (!formData.comment.trim()) {
      toast.error('Please write your review');
      return;
    }

    if (formData.wouldRecommend === null) {
      toast.error('Please indicate if you would recommend this contractor');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    toast.success('Review submitted successfully!');
    router.push(`/jobs/${jobId}`);
  };

  const StarRating = ({
    rating,
    onChange,
    size = 'large',
  }: {
    rating: number;
    onChange: (rating: number) => void;
    size?: 'small' | 'large';
  }) => {
    const starSize = size === 'large' ? 'w-12 h-12' : 'w-6 h-6';

    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`${starSize} ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-white border-b border-gray-200"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Job
          </button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Write a Review</h1>
            <p className="text-gray-600">
              Share your experience with {job.contractor.name}
            </p>
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Job Summary */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <div className="flex items-start gap-4">
                <img
                  src={job.contractor.avatar}
                  alt={job.contractor.name}
                  className="w-16 h-16 rounded-full border-2 border-gray-200"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {job.contractor.name}
                  </h3>
                  <p className="text-gray-600">{job.contractor.company}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {job.title}
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Completed {new Date(job.completedDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                </div>
              </div>
            </MotionDiv>

            {/* Overall Rating */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Overall Rating *</h2>
              <div className="flex flex-col items-center">
                <StarRating
                  rating={formData.overallRating}
                  onChange={handleRatingChange}
                  size="large"
                />
                <p className="text-sm text-gray-600 mt-4">
                  {formData.overallRating === 0 && 'Select a rating'}
                  {formData.overallRating === 1 && 'Poor'}
                  {formData.overallRating === 2 && 'Fair'}
                  {formData.overallRating === 3 && 'Good'}
                  {formData.overallRating === 4 && 'Very Good'}
                  {formData.overallRating === 5 && 'Excellent'}
                </p>
              </div>
            </MotionDiv>

            {/* Category Ratings */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Detailed Ratings
              </h2>
              <MotionDiv
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <MotionDiv key={key} variants={staggerItem}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">{label}</label>
                      <span className="text-sm text-gray-600">
                        {formData.categoryRatings[key as keyof typeof formData.categoryRatings]}/5
                      </span>
                    </div>
                    <StarRating
                      rating={formData.categoryRatings[key as keyof typeof formData.categoryRatings]}
                      onChange={(rating) =>
                        handleCategoryRatingChange(
                          key as keyof ReviewFormData['categoryRatings'],
                          rating
                        )
                      }
                      size="small"
                    />
                  </MotionDiv>
                ))}
              </MotionDiv>
            </MotionDiv>

            {/* Written Review */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Review</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Summarize your experience in one sentence"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review *
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, comment: e.target.value }))
                    }
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Share details about your experience, quality of work, communication, etc."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.comment.length} characters (minimum 50 recommended)
                  </p>
                </div>
              </div>
            </MotionDiv>

            {/* Quick Questions */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Questions</h2>

              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Would you recommend this contractor? *
                  </p>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, wouldRecommend: true }))
                      }
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.wouldRecommend === true
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, wouldRecommend: false }))
                      }
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.wouldRecommend === false
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Was the job completed on time?
                  </p>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, completedOnTime: true }))
                      }
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.completedOnTime === true
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, completedOnTime: false }))
                      }
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.completedOnTime === false
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <Clock className="w-5 h-5" />
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Did the contractor stay within budget?
                  </p>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, stayedWithinBudget: true }))
                      }
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.stayedWithinBudget === true
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, stayedWithinBudget: false }))
                      }
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.stayedWithinBudget === false
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <AlertCircle className="w-5 h-5" />
                      No
                    </button>
                  </div>
                </div>
              </div>
            </MotionDiv>

            {/* Photos */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Photos</h2>
              <p className="text-sm text-gray-600 mb-6">
                Help others by showing the completed work (optional)
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Upload</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImages}
                    />
                  </label>
                </div>

                {uploadingImages && (
                  <p className="text-sm text-teal-600">Uploading images...</p>
                )}
              </div>
            </MotionDiv>

            {/* Submit */}
            <MotionDiv variants={fadeIn} className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Review
                  </>
                )}
              </button>
            </MotionDiv>
          </div>
        </form>
      </div>
    </div>
  );
}
