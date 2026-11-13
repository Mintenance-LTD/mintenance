/**
 * Social features and connections standardized types
 */

import type { User } from './user';

// =============================================
// SOCIAL FEATURES
// =============================================

type ContractorPostType =
  | 'project_showcase'
  | 'tip'
  | 'before_after'
  | 'milestone';





// =============================================
// CONNECTIONS
// =============================================

type ConnectionStatus = 'pending' | 'accepted' | 'blocked';
