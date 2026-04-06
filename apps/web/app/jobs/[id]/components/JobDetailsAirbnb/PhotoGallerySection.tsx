'use client';

import React from 'react';
import Image from 'next/image';

interface PhotoGallerySectionProps {
  displayImages: string[];
  jobTitle: string;
  onImageClick: (index: number) => void;
}

export function PhotoGallerySection({ displayImages, jobTitle, onImageClick }: PhotoGallerySectionProps) {
  return (
    <section className="animate-fade-in">
      {displayImages.length === 1 ? (
        // Single image layout
        <div
          className="relative h-[500px] rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => onImageClick(0)}
        >
          <Image
            src={displayImages[0]}
            alt={jobTitle}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority
          />
          {displayImages.length > 1 && (
            <div className="absolute bottom-6 right-6">
              <button className="px-4 py-2 bg-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                <span>Show all photos</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        // Grid layout for multiple images (Airbnb style)
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[500px] rounded-2xl overflow-hidden">
          {/* Large Image (Left) */}
          <div
            className="col-span-2 row-span-2 relative cursor-pointer group"
            onClick={() => onImageClick(0)}
          >
            <Image
              src={displayImages[0]}
              alt={`${jobTitle} - main`}
              fill
              sizes="50vw"
              className="object-cover group-hover:brightness-90 transition-all duration-300"
              priority
            />
          </div>

          {/* Top Right Small Images */}
          {displayImages.slice(1, 3).map((image, index) => (
            <div
              key={index}
              className="relative cursor-pointer group"
              onClick={() => onImageClick(index + 1)}
            >
              <Image
                src={image}
                alt={`${jobTitle} - ${index + 2}`}
                fill
                sizes="25vw"
                className="object-cover group-hover:brightness-90 transition-all duration-300"
              />
            </div>
          ))}

          {/* Bottom Right Small Images */}
          {displayImages.slice(3, 5).map((image, index) => (
            <div
              key={index}
              className="relative cursor-pointer group"
              onClick={() => onImageClick(index + 3)}
            >
              <Image
                src={image}
                alt={`${jobTitle} - ${index + 4}`}
                fill
                sizes="25vw"
                className="object-cover group-hover:brightness-90 transition-all duration-300"
              />
              {/* Show all photos button on last image */}
              {index === 1 && displayImages.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <button
                    className="px-4 py-2 bg-white rounded-xl font-semibold shadow-lg text-gray-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick(0);
                    }}
                  >
                    +{displayImages.length - 5} more
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* View All Button */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-6 right-6">
              <button
                onClick={() => onImageClick(0)}
                className="px-4 py-2.5 bg-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 border border-gray-300"
              >
                <span className="text-sm">Show all {displayImages.length} photos</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
