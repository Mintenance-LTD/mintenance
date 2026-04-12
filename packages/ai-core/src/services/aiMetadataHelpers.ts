/**
 * Metadata helpers for UnifiedAIService.
 * Extracted to keep the main service file under 500 lines.
 */

import type { AxiosResponse } from 'axios';
import type { ResponseMetadata } from '../types';

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getPlatform(): string {
  // Check if running in React Native
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'mobile';
  }
  // Check if running in browser
  if (typeof window !== 'undefined') {
    return 'web';
  }
  // Server-side
  return 'server';
}

export function createMetadata(response: AxiosResponse): ResponseMetadata {
  return {
    requestId: response.headers?.['x-request-id'] || generateRequestId(),
    timestamp: new Date().toISOString(),
    processingTime: parseInt(response.headers?.['x-processing-time'] || '0'),
    apiCalls: parseInt(response.headers?.['x-api-calls'] || '1'),
    totalCost: parseFloat(response.headers?.['x-total-cost'] || '0'),
    cacheHit: response.headers?.['x-cache-hit'] === 'true',
    modelVersion: response.headers?.['x-model-version'] || 'unknown',
  };
}

export function createEmptyMetadata(): ResponseMetadata {
  return {
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
    processingTime: 0,
    apiCalls: 0,
    totalCost: 0,
    cacheHit: false,
    modelVersion: 'unknown',
  };
}
