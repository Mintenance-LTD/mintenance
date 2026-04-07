'use client';

import React from 'react';
import Image from 'next/image';
import type { PhotoGalleryProps } from './types';

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  images,
  alt,
  onImageClick,
}) => {
  if (images.length === 0) return null;

  return (
    <div className='grid grid-cols-4 grid-rows-2 gap-2 h-[400px] rounded-xl overflow-hidden'>
      {/* Large Image */}
      <div
        className='col-span-2 row-span-2 relative cursor-pointer group'
        onClick={() => onImageClick?.(0)}
      >
        <Image
          src={images[0]}
          alt={`${alt} - main`}
          fill
          sizes='50vw'
          className='object-cover group-hover:brightness-90 transition-all duration-200'
          priority
        />
      </div>

      {/* Small Images */}
      {images.slice(1, 5).map((image, index) => (
        <div
          key={index}
          className='relative cursor-pointer group'
          onClick={() => onImageClick?.(index + 1)}
        >
          <Image
            src={image}
            alt={`${alt} - ${index + 2}`}
            fill
            sizes='25vw'
            className='object-cover group-hover:brightness-90 transition-all duration-200'
          />
        </div>
      ))}

      {/* View All Button (if more than 5 images) */}
      {images.length > 5 && (
        <button
          className='absolute bottom-4 right-4 px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200'
          onClick={() => onImageClick?.(0)}
        >
          Show all {images.length} photos
        </button>
      )}
    </div>
  );
};
