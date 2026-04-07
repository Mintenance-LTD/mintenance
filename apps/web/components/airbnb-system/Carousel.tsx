'use client';

import React, { useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CarouselProps } from './types';

export const Carousel: React.FC<CarouselProps> = ({
  children,
  gap = 16,
  showArrows = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <div className='relative group'>
      {/* Scroll Container */}
      <div
        ref={scrollRef}
        className='flex overflow-x-auto scrollbar-hide scroll-smooth'
        style={{ gap: `${gap}px` }}
      >
        {children}
      </div>

      {/* Navigation Arrows */}
      {showArrows && (
        <>
          <button
            onClick={() => scroll('left')}
            className='absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:scale-110'
            aria-label='Scroll left'
          >
            <ChevronLeft className='w-6 h-6' />
          </button>
          <button
            onClick={() => scroll('right')}
            className='absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:scale-110'
            aria-label='Scroll right'
          >
            <ChevronRight className='w-6 h-6' />
          </button>
        </>
      )}
    </div>
  );
};
