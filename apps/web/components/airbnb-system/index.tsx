/**
 * Mintenance Airbnb-Quality Component System
 * Production-ready components matching Airbnb's design standards
 *
 * Design Principles:
 * - Photography-first (large, high-quality images)
 * - Subtle micro-interactions (smooth hover, scale effects)
 * - Consistent spacing (8px grid)
 * - Accessibility-first (ARIA labels, keyboard nav)
 * - Performance-optimized (React.memo, lazy loading)
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, Star, Search, X, ChevronLeft, ChevronRight, Check, Shield } from 'lucide-react';
import '@/styles/airbnb-system.css';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

export interface ListingCardProps {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  price: string;
  rating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
  badge?: string;
  onFavorite?: (id: string) => void;
  onClick?: (id: string) => void;
}

export interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  variant?: 'hero' | 'inline';
  className?: string;
}

export interface SearchParams {
  service?: string;
  location?: string;
  date?: string;
}

export interface ContractorCardProps {
  id: string;
  name: string;
  image: string;
  category: string;
  rating: number;
  reviewCount: number;
  hourlyRate: string;
  location: string;
  isVerified?: boolean;
  isFavorite?: boolean;
  skills?: string[];
  onFavorite?: (id: string) => void;
  onClick?: (id: string) => void;
}

export interface PhotoGalleryProps {
  images: string[];
  alt: string;
  onImageClick?: (index: number) => void;
}

export interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'link' | 'danger' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface CarouselProps {
  children: React.ReactNode;
  gap?: number;
  showArrows?: boolean;
}

/* ==========================================
   1. LISTING CARD
   Airbnb-style property/job card with image, info, and favorite button
   ========================================== */

export const ListingCard = React.memo<ListingCardProps>(({
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

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorite(!favorite);
    onFavorite?.(id);
  }, [favorite, id, onFavorite]);

  const handleClick = useCallback(() => {
    onClick?.(id);
  }, [id, onClick]);

  return (
    <div className="listing-card" onClick={handleClick}>
      {/* Image Container */}
      <div className="listing-card-image">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />

        {/* Badge */}
        {badge && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-white rounded-lg text-sm font-semibold shadow-md">
            {badge}
          </div>
        )}

        {/* Favorite Button */}
        <button
          className="listing-card-favorite"
          onClick={handleFavorite}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={`w-5 h-5 ${favorite ? 'fill-teal-500 text-teal-500' : 'text-gray-700'}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="listing-card-content">
        <div className="flex items-start justify-between mb-1">
          <h3 className="listing-card-title">{title}</h3>
          {rating && (
            <div className="listing-card-rating">
              <Star className="w-4 h-4 fill-current" />
              <span>{rating.toFixed(1)}</span>
              {reviewCount && (
                <span className="text-gray-600">({reviewCount})</span>
              )}
            </div>
          )}
        </div>
        <p className="listing-card-subtitle">{subtitle}</p>
        <p className="listing-card-price">{price}</p>
      </div>
    </div>
  );
});

ListingCard.displayName = 'ListingCard';

/* ==========================================
   2. SEARCH BAR
   Airbnb hero search with What/Where/When fields
   ========================================== */

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  variant = 'hero',
  className = '',
}) => {
  const [params, setParams] = useState<SearchParams>({});
  const router = useRouter();

  const handleSearch = useCallback(() => {
    // Build search query parameters
    const searchParams = new URLSearchParams();
    if (params.service) searchParams.set('service', params.service);
    if (params.location) searchParams.set('location', params.location);
    if (params.date) searchParams.set('date', params.date);

    // Navigate to contractors search page with query parameters
    router.push(`/contractors?${searchParams.toString()}`);

    // Also call the onSearch callback for any custom handling
    onSearch(params);
  }, [params, onSearch, router]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  return (
    <div className={`search-bar-${variant} ${className}`}>
      {/* Service Field */}
      <div className="search-field">
        <label htmlFor="service">What</label>
        <input
          id="service"
          type="text"
          placeholder="Service type"
          value={params.service || ''}
          onChange={(e) => setParams({ ...params, service: e.target.value })}
          onKeyPress={handleKeyPress}
        />
      </div>

      {/* Location Field */}
      <div className="search-field">
        <label htmlFor="location">Where</label>
        <input
          id="location"
          type="text"
          placeholder="Postcode or area"
          value={params.location || ''}
          onChange={(e) => setParams({ ...params, location: e.target.value })}
          onKeyPress={handleKeyPress}
        />
      </div>

      {/* Date Field */}
      <div className="search-field">
        <label htmlFor="date">When</label>
        <input
          id="date"
          type="date"
          placeholder="Add date"
          value={params.date || ''}
          onChange={(e) => setParams({ ...params, date: e.target.value })}
          onKeyPress={handleKeyPress}
        />
      </div>

      {/* Search Button */}
      <button
        className="search-button"
        onClick={handleSearch}
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};

/* ==========================================
   3. CONTRACTOR CARD
   Detailed contractor profile card
   ========================================== */

export const ContractorCard = React.memo<ContractorCardProps>(({
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

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorite(!favorite);
    onFavorite?.(id);
  }, [favorite, id, onFavorite]);

  return (
    <div
      className="card-airbnb cursor-pointer group"
      onClick={() => onClick?.(id)}
    >
      {/* Image */}
      <div className="relative h-48 rounded-t-xl overflow-hidden">
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Verified Badge */}
        {isVerified && (
          <div className="absolute top-3 left-3 bg-teal-500 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-semibold">
            <Shield className="w-4 h-4" />
            <span>Verified</span>
          </div>
        )}

        {/* Favorite */}
        <button
          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full transition-all duration-200"
          onClick={handleFavorite}
        >
          <Heart className={`w-5 h-5 ${favorite ? 'fill-teal-500 text-teal-500' : 'text-gray-700'}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-gray-600">({reviewCount})</span>
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          {category} • {location}
        </p>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <span className="text-2xl font-bold text-gray-900">{hourlyRate}</span>
          <span className="text-gray-600 text-sm">per hour</span>
        </div>
      </div>
    </div>
  );
});

ContractorCard.displayName = 'ContractorCard';

/* ==========================================
   4. PHOTO GALLERY
   Airbnb-style photo grid (1 large + 4 small)
   ========================================== */

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  images,
  alt,
  onImageClick,
}) => {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px] rounded-xl overflow-hidden">
      {/* Large Image */}
      <div
        className="col-span-2 row-span-2 relative cursor-pointer group"
        onClick={() => onImageClick?.(0)}
      >
        <Image
          src={images[0]}
          alt={`${alt} - main`}
          fill
          sizes="50vw"
          className="object-cover group-hover:brightness-90 transition-all duration-200"
          priority
        />
      </div>

      {/* Small Images */}
      {images.slice(1, 5).map((image, index) => (
        <div
          key={index}
          className="relative cursor-pointer group"
          onClick={() => onImageClick?.(index + 1)}
        >
          <Image
            src={image}
            alt={`${alt} - ${index + 2}`}
            fill
            sizes="25vw"
            className="object-cover group-hover:brightness-90 transition-all duration-200"
          />
        </div>
      ))}

      {/* View All Button (if more than 5 images) */}
      {images.length > 5 && (
        <button
          className="absolute bottom-4 right-4 px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={() => onImageClick?.(0)}
        >
          Show all {images.length} photos
        </button>
      )}
    </div>
  );
};

/* ==========================================
   5. RATING STARS
   Interactive or display-only star ratings
   ========================================== */

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

  const handleClick = useCallback((value: number) => {
    if (interactive) {
      setSelectedRating(value);
      onChange?.(value);
    }
  }, [interactive, onChange]);

  const displayRating = interactive ? (hoverRating || selectedRating) : rating;

  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, index) => {
        const value = index + 1;
        const isFilled = value <= Math.floor(displayRating);
        const isHalf = value === Math.ceil(displayRating) && displayRating % 1 !== 0;

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
        <span className="ml-2 text-sm font-semibold text-gray-900">
          {displayRating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

/* ==========================================
   6. BADGE
   Color-coded status badges
   ========================================== */

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const variants = {
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-gray-100 text-gray-700',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
};

/* ==========================================
   7. BUTTON
   Multiple button variants: primary, secondary, ghost, outline, link, danger, destructive, success
   ========================================== */

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'bg-transparent border-none hover:bg-gray-100 text-gray-900',
    outline: 'inline-flex items-center justify-center rounded-xl font-semibold text-gray-900 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50',
    link: 'bg-transparent border-none text-teal-600 hover:text-teal-700 underline-offset-4 hover:underline',
    danger: 'inline-flex items-center justify-center rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow-md',
    destructive: 'inline-flex items-center justify-center rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow-md',
    success: 'inline-flex items-center justify-center rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm hover:shadow-md',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} transition-all duration-150 ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

/* ==========================================
   8. INPUT
   Text input with label and error states
   ========================================== */

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          {label}
        </label>
      )}
      <input
        className={`input-airbnb ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-600">{helperText}</p>
      )}
    </div>
  );
};

/* ==========================================
   9. MODAL
   Slide-up modal with backdrop blur
   ========================================== */

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full ${sizes[size]} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl transform transition-all duration-300 max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ==========================================
   10. CAROUSEL
   Horizontal scroll carousel with arrows
   ========================================== */

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
    <div className="relative group">
      {/* Scroll Container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ gap: `${gap}px` }}
      >
        {children}
      </div>

      {/* Navigation Arrows */}
      {showArrows && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:scale-110"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:scale-110"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
};

/* ==========================================
   EXPORTS
   ========================================== */

export default {
  ListingCard,
  SearchBar,
  ContractorCard,
  PhotoGallery,
  RatingStars,
  Badge,
  Button,
  Input,
  Modal,
  Carousel,
};
