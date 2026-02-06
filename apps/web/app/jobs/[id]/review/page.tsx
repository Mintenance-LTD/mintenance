'use client';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leave a Review | Mintenance',
  description: 'Rate and review your contractor after a completed job. Help the community find great professionals.',
};

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
  Upload,
  X,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';

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
  comment: string;
  wouldRecommend: boolean | null;
  beforePhotos: string[];
  afterPhotos: string[];
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
    comment: '',
    wouldRecommend: null,
    beforePhotos: [],
    afterPhotos: [],
  });

  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // Clean up all blob URLs when component unmounts
      formData.beforePhotos.forEach((photo) => {
        if (photo && photo.startsWith('blob:')) {
          URL.revokeObjectURL(photo);
        }
      });
      formData.afterPhotos.forEach((photo) => {
        if (photo && photo.startsWith('blob:')) {
          URL.revokeObjectURL(photo);
        }
      });
    };
  }, [formData.beforePhotos, formData.afterPhotos]);

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, overallRating: rating }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);

    // Create blob URLs for preview
    const newImages = Array.from(files).map((file) => URL.createObjectURL(file));

    setFormData((prev) => ({
      ...prev,
      [type === 'before' ? 'beforePhotos' : 'afterPhotos']: [
        ...prev[type === 'before' ? 'beforePhotos' : 'afterPhotos'],
        ...newImages
      ],
    }));

    setUploadingImages(false);
    toast.success(`${files.length} ${type} photo(s) uploaded`);
  };

  const handleRemoveImage = (index: number, type: 'before' | 'after') => {
    setFormData((prev) => {
      const photoArray = prev[type === 'before' ? 'beforePhotos' : 'afterPhotos'];
      const photoToRemove = photoArray[index];

      // Clean up blob URL if it's a blob URL (not a regular URL)
      if (photoToRemove && photoToRemove.startsWith('blob:')) {
        URL.revokeObjectURL(photoToRemove);
      }

      return {
        ...prev,
        [type === 'before' ? 'beforePhotos' : 'afterPhotos']:
          photoArray.filter((_, i) => i !== index),
      };
    });
    toast.success('Photo removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    toast.success('Review submitted successfully!');
    router.push(`/jobs/${jobId}`);
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-white border-b border-gray-200"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-4">
            <img
              src={job.contractor.avatar}
              alt={job.contractor.name}
              className="w-16 h-16 rounded-full border-2 border-gray-200"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Review {job.contractor.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="w-4 h-4" />
                <span>{job.title}</span>
              </div>
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Rating Section - Airbnb Style */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">How was your experience?</h2>

            <div className="flex flex-col items-center py-4">
              <div className="flex items-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-all duration-200 hover:scale-110"
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

              <p className="text-lg font-medium text-gray-700">
                {formData.overallRating === 0 && 'Select a rating'}
                {formData.overallRating > 0 && ratingLabels[formData.overallRating]}
              </p>
            </div>
          </MotionDiv>

          {/* Before/After Photos - Airbnb Style */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Add photos (optional)</h2>
            <p className="text-sm text-gray-600 mb-6">Help others see the transformation</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before Photos */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Before</h3>
                <div className="grid grid-cols-2 gap-2">
                  {formData.beforePhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={`Before photo ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx, 'before')}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                      onChange={(e) => handleImageUpload(e, 'before')}
                      className="hidden"
                      disabled={uploadingImages}
                    />
                  </label>
                </div>
              </div>

              {/* After Photos */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">After</h3>
                <div className="grid grid-cols-2 gap-2">
                  {formData.afterPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={`After photo ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx, 'after')}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                      onChange={(e) => handleImageUpload(e, 'after')}
                      className="hidden"
                      disabled={uploadingImages}
                    />
                  </label>
                </div>
              </div>
            </div>

            {uploadingImages && (
              <div className="mt-4 text-center">
                <p className="text-sm text-teal-600">Uploading images...</p>
              </div>
            )}
          </MotionDiv>

          {/* Written Review */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Share your experience</h2>
            <p className="text-sm text-gray-600 mb-4">Tell others about the quality, communication, and professionalism</p>

            <textarea
              value={formData.comment}
              onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="What went well? What could have been better?"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">
                {formData.comment.length} characters (minimum 20)
              </p>
              <p className={`text-sm font-medium ${formData.comment.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                {formData.comment.length >= 20 ? <CheckCircle className="w-5 h-5 inline" /> : null}
              </p>
            </div>
          </MotionDiv>

          {/* Recommendation */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Would you recommend this contractor?</h2>

            <div className="grid grid-cols-2 gap-4">
              <MotionButton
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormData((prev) => ({ ...prev, wouldRecommend: true }))}
                className={`flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 transition-all ${
                  formData.wouldRecommend === true
                    ? 'border-teal-600 bg-teal-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <ThumbsUp className={`w-8 h-8 ${formData.wouldRecommend === true ? 'text-teal-600' : 'text-gray-400'}`} />
                <span className={`font-semibold ${formData.wouldRecommend === true ? 'text-teal-900' : 'text-gray-700'}`}>
                  Yes
                </span>
              </MotionButton>

              <MotionButton
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormData((prev) => ({ ...prev, wouldRecommend: false }))}
                className={`flex flex-col items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 transition-all ${
                  formData.wouldRecommend === false
                    ? 'border-red-600 bg-red-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <ThumbsDown className={`w-8 h-8 ${formData.wouldRecommend === false ? 'text-red-600' : 'text-gray-400'}`} />
                <span className={`font-semibold ${formData.wouldRecommend === false ? 'text-red-900' : 'text-gray-700'}`}>
                  No
                </span>
              </MotionButton>
            </div>
          </MotionDiv>

          {/* Submit Button */}
          <div className="flex gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <MotionButton
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
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
