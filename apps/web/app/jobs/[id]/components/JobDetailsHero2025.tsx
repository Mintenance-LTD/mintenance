'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { fadeIn, scaleIn } from '@/lib/animations/variants';
import EmblaCarousel from 'embla-carousel-react';
import { MotionDiv, MotionImg } from '@/components/ui/MotionDiv';

interface JobDetailsHero2025Props {
  title: string;
  description: string;
  category: string;
  urgency: string;
  budget: number;
  status: string;
  location: string;
  createdAt: string;
  images?: string[];
  homeowner: {
    name: string;
    avatar?: string;
    rating?: number;
    jobsPosted?: number;
  };
}

export function JobDetailsHero2025({
  title,
  description,
  category,
  urgency,
  budget,
  status,
  location,
  createdAt,
  images = [],
  homeowner,
}: JobDetailsHero2025Props) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      posted: 'bg-blue-100 text-blue-700 border-blue-200',
      assigned: 'bg-teal-100 text-teal-700 border-teal-200',
      in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
      review: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-700',
      medium: 'bg-amber-100 text-amber-700',
      high: 'bg-emerald-100 text-emerald-700',
      emergency: 'bg-rose-100 text-rose-700',
    };
    return colors[urgency] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <MotionDiv
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="relative bg-gray-900">
          <div className="relative aspect-video">
            <Image
              src={images[0]}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
            />
          </div>

          {/* Image Counter */}
          {images.length > 1 && (
            <button
              onClick={() => setSelectedImage(0)}
              className="absolute bottom-4 right-4 px-3 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors"
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              View all {images.length} photos
            </button>
          )}

          {/* Category Badge Overlay */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg text-sm font-semibold shadow-lg">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(status)}`}>
                {status.replace('_', ' ').toUpperCase()}
              </span>

              {/* Urgency Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getUrgencyColor(urgency)}`}>
                {urgency.charAt(0).toUpperCase() + urgency.slice(1)} Priority
              </span>
            </div>
          </div>

          {/* Budget */}
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Budget</div>
            <div className="text-3xl font-bold text-gray-900">
              ${budget.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{description}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-6 bg-gray-50 rounded-xl">
          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Location</div>
              <div className="font-semibold text-gray-900">{location}</div>
            </div>
          </div>

          {/* Posted Date */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Posted</div>
              <div className="font-semibold text-gray-900">{formatDate(createdAt)}</div>
            </div>
          </div>

          {/* Category */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Category</div>
              <div className="font-semibold text-gray-900">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Homeowner Info */}
        <div className="p-6 bg-gradient-subtle rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
            Posted By
          </h3>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {homeowner.avatar ? (
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={homeowner.avatar}
                  alt={homeowner.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center border-2 border-gray-200">
                <span className="text-teal-700 font-bold text-lg">
                  {homeowner.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </span>
              </div>
            )}

            {/* Details */}
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-lg">{homeowner.name}</div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                {homeowner.rating && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {homeowner.rating.toFixed(1)}
                  </span>
                )}
                {homeowner.jobsPosted && (
                  <span>{homeowner.jobsPosted} jobs posted</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage !== null && (
          <MotionDiv
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <MotionImg
              src={images[selectedImage]}
              alt={`Photo ${selectedImage + 1}`}
              className="max-w-full max-h-full object-contain"
              variants={scaleIn}
              initial="initial"
              animate="animate"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
                  }}
                  className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));
                  }}
                  className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
}
