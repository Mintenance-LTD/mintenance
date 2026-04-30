'use client';

/**
 * TrackedImage — drop-in <Image>/<img> replacement that fires
 * Sentry telemetry on load failures.
 *
 * 2026-04-30 audit P1 (Thumbnail/Image Failures): the audit asked
 * for "broken-image telemetry" so we can spot dead storage paths in
 * the wild without waiting for users to report missing thumbnails.
 * Wrap any user-content image (job photos, property photos,
 * assessment thumbnails) in this and the failure rate becomes a
 * Sentry breadcrumb + a `tag:imageBrokenSource` event we can search
 * on.
 *
 * Usage:
 *   <TrackedImage
 *     src={photoUrl}
 *     alt="Job photo"
 *     source="job_attachments"
 *     // any standard <img> attributes
 *   />
 */
import { useCallback, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

interface TrackedImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'onError'
> {
  /**
   * Where the URL came from. Sentry tags this so dashboards can
   * group failures by source table (job_attachments,
   * assessment_images, properties.photos, etc.).
   */
  source: string;
  /** Optional fallback URL shown when the primary URL fails to load. */
  fallbackSrc?: string;
  /** Called once per image after the first failure is logged. */
  onLoadError?: (originalSrc: string) => void;
}

export function TrackedImage({
  source,
  src,
  fallbackSrc,
  onLoadError,
  alt,
  ...rest
}: TrackedImageProps) {
  const [errored, setErrored] = useState(false);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (errored) return;
      setErrored(true);
      const originalSrc = e.currentTarget.src;

      // Sentry breadcrumb + tagged event so this is searchable in
      // release health without tripping rate limits.
      Sentry.addBreadcrumb({
        category: 'image-load',
        level: 'warning',
        message: `Image failed to load (source=${source})`,
        data: { src: originalSrc },
      });
      Sentry.captureMessage('image_load_failed', {
        level: 'warning',
        tags: {
          imageSource: source,
          imageBrokenSource: source,
        },
        contexts: {
          image: {
            src: originalSrc,
            alt: typeof alt === 'string' ? alt : '',
          },
        },
      });

      onLoadError?.(originalSrc);
    },
    [errored, source, alt, onLoadError]
  );

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={errored && fallbackSrc ? fallbackSrc : src}
      alt={alt ?? ''}
      onError={handleError}
      {...rest}
    />
  );
}
