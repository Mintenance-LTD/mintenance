'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Heart, Star, Shield } from 'lucide-react';
import type { ContractorCardProps } from './types';

export const ContractorCard = React.memo<ContractorCardProps>(
  ({
    id,
    name,
    image,
    category,
    rating,
    reviewCount,
    hourlyRate,
    location,
    isVerified = false,
    isFavorite = false,
    skills = [],
    onFavorite,
    onClick,
  }) => {
    const [favorite, setFavorite] = useState(isFavorite);

    const handleFavorite = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorite(!favorite);
        onFavorite?.(id);
      },
      [favorite, id, onFavorite]
    );

    return (
      <div
        className='card-airbnb cursor-pointer group'
        onClick={() => onClick?.(id)}
      >
        {/* Image */}
        <div className='relative h-48 rounded-t-xl overflow-hidden'>
          <Image
            src={image}
            alt={name}
            fill
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            className='object-cover group-hover:scale-105 transition-transform duration-300'
          />

          {/* Verified Badge */}
          {isVerified && (
            <div className='absolute top-3 left-3 bg-teal-500 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-semibold'>
              <Shield className='w-4 h-4' />
              <span>Verified</span>
            </div>
          )}

          {/* Favorite */}
          <button
            className='absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full transition-all duration-200'
            onClick={handleFavorite}
          >
            <Heart
              className={`w-5 h-5 ${favorite ? 'fill-teal-500 text-teal-500' : 'text-gray-700'}`}
            />
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          <div className='flex items-start justify-between mb-2'>
            <h3 className='text-xl font-semibold text-gray-900'>{name}</h3>
            <div className='flex items-center gap-1 text-sm font-semibold'>
              <Star className='w-4 h-4 fill-amber-400 text-amber-400' />
              <span>{rating.toFixed(1)}</span>
              <span className='text-gray-600'>({reviewCount})</span>
            </div>
          </div>

          <p className='text-gray-600 mb-4'>
            {category} • {location}
          </p>

          {/* Skills */}
          {skills.length > 0 && (
            <div className='flex flex-wrap gap-2 mb-4'>
              {skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className='px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium'
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className='flex items-center justify-between pt-4 border-t border-gray-200'>
            <span className='text-2xl font-bold text-gray-900'>
              {hourlyRate}
            </span>
            <span className='text-gray-600 text-sm'>per hour</span>
          </div>
        </div>
      </div>
    );
  }
);

ContractorCard.displayName = 'ContractorCard';
