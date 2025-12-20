'use client';

import React from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import Image from 'next/image';

interface PortfolioSectionProps {
  images: string[];
}

/**
 * PortfolioSection - Portfolio gallery showing completed jobs
 */
export function PortfolioSection({ images }: PortfolioSectionProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <StandardCard>
      <div className="space-y-4">
        <h4 className="text-base font-semibold text-gray-900">Portfolio</h4>
        <div className="grid grid-cols-3 gap-4">
          {images.slice(0, 6).map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
            >
              <Image
                src={image}
                alt={`Portfolio image ${index + 1}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          ))}
        </div>
        {images.length > 6 && (
          <p className="text-sm text-gray-600 text-center">
            +{images.length - 6} more images
          </p>
        )}
      </div>
    </StandardCard>
  );
}

