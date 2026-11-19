'use client';

import { useEffect, useReducer, useRef } from 'react';

interface Options {
  images: string[];
  isAssessing: boolean;
  location?: string;
  propertyType?: string;
  assess: (
    images: string[],
    context: { location?: string; propertyType?: string }
  ) => Promise<unknown>;
}

/** Assess each changed photo set once, using the latest form context when ready. */
export function usePhotoAssessmentTrigger({
  images,
  isAssessing,
  location,
  propertyType,
  assess,
}: Options) {
  const lastAttempt = useRef('[]');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [completed, settled] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const imageKey = JSON.stringify(images);
  useEffect(() => {
    if (!images.length) {
      lastAttempt.current = imageKey;
      return;
    }
    if (isAssessing || inFlight.current || lastAttempt.current === imageKey)
      return;
    lastAttempt.current = imageKey;
    inFlight.current = true;
    // The assessment hook reports failures. Do not repeatedly retry an unchanged set.
    void assess(images, { location, propertyType })
      .catch(() => undefined)
      .finally(() => {
        inFlight.current = false;
        if (mounted.current) settled();
      });
  }, [
    images,
    imageKey,
    isAssessing,
    location,
    propertyType,
    assess,
    completed,
  ]);
}
