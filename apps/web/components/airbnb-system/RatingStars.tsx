'use client';

import React, { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import type { RatingStarsProps } from './types';

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  showNumber = false,
  interactive = false,
  onChange,
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(rating);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = useCallback(
    (value: number) => {
      if (interactive) {
        setSelectedRating(value);
        onChange?.(value);
      }
    },
    [interactive, onChange]
  );

  const displayRating = interactive ? hoverRating || selectedRating : rating;

  return (
    <div className='flex items-center gap-1'>
      {[...Array(maxRating)].map((_, index) => {
        const value = index + 1;
        const isFilled = value <= Math.floor(displayRating);
        const isHalf =
          value === Math.ceil(displayRating) && displayRating % 1 !== 0;

        return (
          <button
            key={index}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-transform duration-150 ${
              interactive && hoverRating >= value ? 'scale-110' : ''
            }`}
            onClick={() => handleClick(value)}
            onMouseEnter={() => interactive && setHoverRating(value)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
            aria-label={`Rate ${value} out of ${maxRating}`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : isHalf
                    ? 'fill-amber-400 text-amber-400 opacity-50'
                    : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
      {showNumber && (
        <span className='ml-2 text-sm font-semibold text-gray-900'>
          {displayRating.toFixed(1)}
        </span>
      )}
    </div>
  );
};
