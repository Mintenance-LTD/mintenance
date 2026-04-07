'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Heart, Star } from 'lucide-react';
import type { ListingCardProps } from './types';

export const ListingCard = React.memo<ListingCardProps>(
  ({
    id,
    image,
    title,
    subtitle,
    price,
    rating,
    reviewCount,
    isFavorite = false,
    badge,
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

    const handleClick = useCallback(() => {
      onClick?.(id);
    }, [id, onClick]);

    return (
      <div className='listing-card' onClick={handleClick}>
        {/* Image Container */}
        <div className='listing-card-image'>
          <Image
            src={image}
            alt={title}
            fill
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            className='object-cover'
          />

          {/* Badge */}
          {badge && (
            <div className='absolute top-3 left-3 px-3 py-1 bg-white rounded-lg text-sm font-semibold shadow-md'>
              {badge}
            </div>
          )}

          {/* Favorite Button */}
          <button
            className='listing-card-favorite'
            onClick={handleFavorite}
            aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`w-5 h-5 ${favorite ? 'fill-teal-500 text-teal-500' : 'text-gray-700'}`}
            />
          </button>
        </div>

        {/* Content */}
        <div className='listing-card-content'>
          <div className='flex items-start justify-between mb-1'>
            <h3 className='listing-card-title'>{title}</h3>
            {rating && (
              <div className='listing-card-rating'>
                <Star className='w-4 h-4 fill-current' />
                <span>{rating.toFixed(1)}</span>
                {reviewCount && (
                  <span className='text-gray-600'>({reviewCount})</span>
                )}
              </div>
            )}
          </div>
          <p className='listing-card-subtitle'>{subtitle}</p>
          <p className='listing-card-price'>{price}</p>
        </div>
      </div>
    );
  }
);

ListingCard.displayName = 'ListingCard';
