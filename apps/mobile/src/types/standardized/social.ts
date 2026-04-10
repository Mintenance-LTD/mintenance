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

interface ContractorPost {
  id: string;
  contractorId: string;
  type: ContractorPostType;
  content: string;
  photos?: string[];
  likes: number;
  comments: number;
  shares: number;
  hashtags?: string[];
  createdAt: string;
  updatedAt: string;
  // Relationships
  contractor?: User;
}

interface ContractorPostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  // Relationships
  user?: User;
}

// =============================================
// CONNECTIONS
// =============================================

type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

interface MutualConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: ConnectionStatus;
  requestedAt: string;
  acceptedAt?: string;
  requester?: User;
  receiver?: User;
}

interface ConnectionRequest {
  id: string;
  requesterId: string;
  receiverId: string;
  message?: string;
  status: ConnectionStatus;
  createdAt: string;
  requester: User;
}
