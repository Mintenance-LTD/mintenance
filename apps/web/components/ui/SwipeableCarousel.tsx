'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';

interface SwipeableCarouselProps {
  children: React.ReactNode[];
  autoplay?: boolean;
  autoplayInterval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSlideChange?: (index: number) => void;
}

export const SwipeableCarousel: React.FC<SwipeableCarouselProps> = ({
  children,
  autoplay = false,
  autoplayInterval = 3000,
  showDots = true,
  showArrows = true,
  className = '',
  style = {},
  onSlideChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const minSwipeDistance = 50;

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex) return;
    
    setIsTransitioning(true);
    setCurrentIndex(index);
    
    if (onSlideChange) {
      onSlideChange(index);
    }
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentIndex, isTransitioning, onSlideChange]);

  const nextSlide = useCallback(() => {
    const nextIndex = (currentIndex + 1) % children.length;
    goToSlide(nextIndex);
  }, [currentIndex, children.length, goToSlide]);

  const prevSlide = useCallback(() => {
    const prevIndex = currentIndex === 0 ? children.length - 1 : currentIndex - 1;
    goToSlide(prevIndex);
  }, [currentIndex, children.length, goToSlide]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // Autoplay functionality
  useEffect(() => {
    if (autoplay && children.length > 1) {
      autoplayRef.current = setInterval(nextSlide, autoplayInterval);
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [autoplay, autoplayInterval, nextSlide, children.length]);

  // Pause autoplay on hover
  const handleMouseEnter = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (autoplay && children.length > 1) {
      autoplayRef.current = setInterval(nextSlide, autoplayInterval);
    }
  };

  const containerStyles = {
    position: 'relative' as const,
    overflow: 'hidden',
    borderRadius: theme.borderRadius.lg,
    ...style,
  };

  const trackStyles = {
    display: 'flex',
    transform: `translateX(-${currentIndex * 100}%)`,
    transition: isTransitioning ? 'transform 0.3s ease-in-out' : 'none',
    height: '100%',
  };

  const slideStyles = {
    minWidth: '100%',
    flexShrink: 0,
    height: '100%',
  };

  const arrowStyles = {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '18px',
    color: theme.colors.textPrimary,
    transition: 'all 0.2s ease-in-out',
    zIndex: 10,
  };

  const leftArrowStyles = {
    ...arrowStyles,
    left: theme.spacing[4],
  };

  const rightArrowStyles = {
    ...arrowStyles,
    right: theme.spacing[4],
  };

  const dotsStyles = {
    position: 'absolute' as const,
    bottom: theme.spacing[4],
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: theme.spacing[2],
    zIndex: 10,
  };

  const dotStyles = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  };

  const activeDotStyles = {
    ...dotStyles,
    backgroundColor: 'white',
    transform: 'scale(1.2)',
  };

  if (children.length === 0) {
    return null;
  }

  return (
    <div
      ref={carouselRef}
      className={`swipeable-carousel ${className}`}
      style={containerStyles}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={trackStyles}>
        {children.map((child, index) => (
          <div key={index} style={slideStyles}>
            {child}
          </div>
        ))}
      </div>

      {showArrows && children.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            style={leftArrowStyles}
            aria-label="Previous slide"
            disabled={isTransitioning}
          >
            ‹
          </button>
          <button
            onClick={nextSlide}
            style={rightArrowStyles}
            aria-label="Next slide"
            disabled={isTransitioning}
          >
            ›
          </button>
        </>
      )}

      {showDots && children.length > 1 && (
        <div style={dotsStyles}>
          {children.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              style={index === currentIndex ? activeDotStyles : dotStyles}
              aria-label={`Go to slide ${index + 1}`}
              disabled={isTransitioning}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .swipeable-carousel button:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: translateY(-50%) scale(1.1);
        }
        
        .swipeable-carousel button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default SwipeableCarousel;
