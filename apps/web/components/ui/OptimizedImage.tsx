'use client';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}
// Generate a simple blur placeholder
const defaultBlurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  fill = false,
  sizes,
  quality = 75,
  placeholder = 'blur',
  blurDataURL = defaultBlurDataURL,
  onLoad,
  onError,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };
  // Fallback for errored images
  if (hasError) {
    return (
      <div
        className={cn(
          'bg-gray-100 flex items-center justify-center',
          className
        )}
        style={fill ? undefined : { width, height }}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  const imageProps = fill
    ? { fill: true, sizes: sizes || '100vw' }
    : { width: width || 500, height: height || 500 };
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        {...imageProps}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        quality={quality}
        placeholder={src.startsWith('data:') ? 'empty' : placeholder}
        blurDataURL={src.startsWith('data:') ? undefined : blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'duration-700 ease-in-out',
          isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0',
          fill && 'object-cover'
        )}
        style={!fill ? undefined : { objectFit }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
    </div>
  );
}
// Optimized profile image with better defaults for avatars
export function ProfileImage({
  src,
  alt,
  size = 'md',
  className = '',
}: {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeMap = {
    sm: 40,
    md: 60,
    lg: 80,
    xl: 120,
  };
  const dimension = sizeMap[size];
  if (!src) {
    // Fallback initials avatar
    const initials = alt
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return (
      <div
        className={cn(
          'bg-primary text-white flex items-center justify-center font-semibold rounded-full',
          className
        )}
        style={{ width: dimension, height: dimension, fontSize: dimension / 3 }}
      >
        {initials}
      </div>
    );
  }
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      className={cn('rounded-full', className)}
      quality={85}
    />
  );
}
// Optimized job image with responsive sizing
export function JobImage({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className={cn('aspect-video', className)}
      priority={priority}
      quality={80}
    />
  );
}
// Optimized gallery image with lightbox support
export function GalleryImage({
  src,
  alt,
  onClick,
  className = '',
}: {
  src: string;
  alt: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="aspect-square"
        quality={70}
      />
    </button>
  );
}