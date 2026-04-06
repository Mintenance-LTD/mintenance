'use client';

import React from 'react';
import Image from 'next/image';
import { Modal } from '@/components/airbnb-system';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayImages: string[];
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  jobTitle: string;
}

export function ImageModal({
  isOpen,
  onClose,
  displayImages,
  selectedImageIndex,
  setSelectedImageIndex,
  onPrev,
  onNext,
  jobTitle,
}: ImageModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={`${jobTitle} - Photo ${selectedImageIndex + 1} of ${displayImages.length}`}
    >
      <div className="relative">
        <div className="relative h-[600px] rounded-xl overflow-hidden">
          <Image
            src={displayImages[selectedImageIndex]}
            alt={`${jobTitle} - ${selectedImageIndex + 1}`}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        {/* Navigation */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-gray-900" />
            </button>
          </>
        )}

        {/* Thumbnails */}
        {displayImages.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                  index === selectedImageIndex
                    ? 'ring-2 ring-teal-500 ring-offset-2'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Image
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
