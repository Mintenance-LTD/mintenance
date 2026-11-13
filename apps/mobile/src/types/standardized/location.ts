/**
 * Location and meeting standardized types
 */

import type { User } from './user';
import type { Job } from './jobs';

// =============================================
// LOCATION AND MEETING
// =============================================

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}
