'use client';

import { useEffect, useRef } from 'react';
import { logger } from '@mintenance/shared';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second

/**
 * ChunkRetryHandler - Automatically handles chunk loading errors
 *
 * This component:
 * 1. Detects ChunkLoadError events
 * 2. Implements exponential backoff retry strategy
 * 3. Clears service worker cache on repeated failures
 * 4. Automatically reloads the page after cache clear
 * 5. Tracks retry attempts to prevent infinite loops
 *
 * Based on Next.js community best practices for handling chunk errors
 * @see https://github.com/vercel/next.js/issues/38507
 */
export function ChunkRetryHandler() {
  const retryCountRef = useRef(0);
  const hasReloadedRef = useRef(false);

  useEffect(() => {
    const handleChunkError = async (event: ErrorEvent) => {
      const errorMessage = event.message?.toLowerCase() || '';
      const isChunkError =
        errorMessage.includes('loading chunk') ||
        errorMessage.includes('chunkloaderror') ||
        errorMessage.includes('chunk') && errorMessage.includes('failed');

      if (!isChunkError) {
        return; // Not a chunk error, let other handlers deal with it
      }

      logger.warn('[ChunkRetry] Chunk loading error detected:', event.message', [object Object], { service: 'app' });

      // Prevent default error handling
      event.preventDefault();

      // Increment retry count
      retryCountRef.current += 1;

      // If we've exceeded max retries, clear cache and hard reload
      if (retryCountRef.current >= MAX_RETRIES) {
        logger.error('[ChunkRetry] Max retries (%s', [object Object], { service: 'app' }) exceeded. Clearing cache and reloading...`);

        // Notify service worker to clear cache
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHUNK_LOAD_ERROR',
          });
        }

        // Clear local/session storage that might be stale
        try {
          sessionStorage.removeItem('next-build-id');
        } catch (e) {
          logger.warn('[ChunkRetry] Failed to clear session storage:', e', [object Object], { service: 'app' });
        }

        // Hard reload after a brief delay
        if (!hasReloadedRef.current) {
          hasReloadedRef.current = true;
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }

        return;
      }

      // Calculate exponential backoff delay
      const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
      console.info(`[ChunkRetry] Retry ${retryCountRef.current}/${MAX_RETRIES} in ${delay}ms...`);

      // Retry with exponential backoff
      setTimeout(() => {
        console.info('[ChunkRetry] Attempting page reload...');
        window.location.reload();
      }, delay);
    };

    // Listen for unhandled errors
    window.addEventListener('error', handleChunkError);

    // Also listen for unhandled promise rejections (chunk loads can fail as promises)
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason?.toString() || '';
      if (
        reason.includes('Loading chunk') ||
        reason.includes('ChunkLoadError') ||
        (reason.includes('chunk') && reason.includes('failed'))
      ) {
        logger.warn('[ChunkRetry] Chunk error in promise rejection:', reason', [object Object], { service: 'app' });

        // Convert to ErrorEvent format
        const errorEvent = new ErrorEvent('error', {
          message: reason,
          error: event.reason,
        });

        handleChunkError(errorEvent);
      }
    };

    window.addEventListener('unhandledrejection', handlePromiseRejection);

    // Reset retry count on successful navigation
    const resetRetryCount = () => {
      if (retryCountRef.current > 0) {
        console.info('[ChunkRetry] Navigation successful, resetting retry count');
        retryCountRef.current = 0;
        hasReloadedRef.current = false;
      }
    };

    // Listen for successful page loads
    window.addEventListener('load', resetRetryCount);

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CACHE_CLEARED') {
        console.info('[ChunkRetry] Service worker cache cleared:', event.data.message);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Cleanup
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
      window.removeEventListener('load', resetRetryCount);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
}
