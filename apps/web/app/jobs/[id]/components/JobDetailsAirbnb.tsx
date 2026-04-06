/**
 * JobDetailsAirbnb Component
 * Production-quality Airbnb-style job details page
 *
 * Design Principles:
 * - Photography-first with hero image gallery (Airbnb 5-photo grid)
 * - Clean typography hierarchy
 * - Subtle micro-interactions (hover effects, smooth transitions)
 * - Mobile-first responsive design
 * - Accessibility-first (ARIA labels, semantic HTML)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { PageHeader } from './JobDetailsAirbnb/PageHeader';
import { PhotoGallerySection } from './JobDetailsAirbnb/PhotoGallerySection';
import { MainContent } from './JobDetailsAirbnb/MainContent';
import { Sidebar } from './JobDetailsAirbnb/Sidebar';
import { ImageModal } from './JobDetailsAirbnb/ImageModal';
import type { JobDetailsAirbnbProps } from './JobDetailsAirbnb/types';

export type { JobDetailsAirbnbProps } from './JobDetailsAirbnb/types';

export function JobDetailsAirbnb({
  job,
  images,
  homeowner,
  property,
  contractor,
  bids = [],
  userRole,
  isOwner,
  onEdit,
  onComplete,
  onContact,
}: JobDetailsAirbnbProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Ensure we have at least one placeholder image
  const displayImages = images.length > 0
    ? images
    : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800'];

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setIsImageModalOpen(true);
  }, []);

  const handleNextImage = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev < displayImages.length - 1 ? prev + 1 : 0
    );
  }, [displayImages.length]);

  const handlePrevImage = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev > 0 ? prev - 1 : displayImages.length - 1
    );
  }, [displayImages.length]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Back Button */}
      <PageHeader
        jobTitle={job.title}
        jobDescription={job.description}
        isFavorite={isFavorite}
        onToggleFavorite={() => setIsFavorite(!isFavorite)}
      />

      {/* Photo Gallery - Airbnb 5-Photo Grid Layout */}
      <PhotoGallerySection
        displayImages={displayImages}
        jobTitle={job.title}
        onImageClick={handleImageClick}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
        {/* Left Column - Main Content */}
        <MainContent
          job={job}
          homeowner={homeowner}
          property={property}
          contractor={contractor}
          bids={bids}
          userRole={userRole}
          onContact={onContact}
        />

        {/* Right Column - Sticky Sidebar */}
        <Sidebar
          job={job}
          bids={bids}
          userRole={userRole}
          isOwner={isOwner}
          onEdit={onEdit}
          onComplete={onComplete}
          onContact={onContact}
        />
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        displayImages={displayImages}
        selectedImageIndex={selectedImageIndex}
        setSelectedImageIndex={setSelectedImageIndex}
        onPrev={handlePrevImage}
        onNext={handleNextImage}
        jobTitle={job.title}
      />
    </div>
  );
}
