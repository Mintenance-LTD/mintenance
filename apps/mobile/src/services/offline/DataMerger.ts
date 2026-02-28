import type { JobData, BidData, ProfileData } from './types';

/**
 * Provides intelligent merge strategies for entity-specific data conflicts.
 * Merges client and server versions of entities by applying domain-appropriate
 * rules (e.g. server wins for status fields, client wins for user preferences).
 */
export class DataMerger {
  /** Merge job data: client editable fields win, server status/identity fields win */
  mergeJobData(clientData: unknown, serverData: unknown): unknown {
    const client = clientData as JobData;
    const server = serverData as JobData;
    return {
      ...server,
      title: client.title || server.title,
      description: client.description || server.description,
      budget: client.budget !== undefined ? client.budget : server.budget,
      priority: client.priority || server.priority,
      // Server wins for status and critical fields
      status: server.status,
      contractorId: server.contractorId,
      homeownerId: server.homeownerId,
      // Merge photos as union set
      photos: Array.from(new Set([
        ...(server.photos || []),
        ...(client.photos || []),
      ])),
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    };
  }

  /** Merge bid data: bids are mostly immutable; server wins for status/amount */
  mergeBidData(clientData: unknown, serverData: unknown): unknown {
    const client = clientData as BidData;
    const server = serverData as BidData;
    return {
      ...server,
      // Client can update description only before acceptance
      description: server.status === 'pending'
        ? (client.description || server.description)
        : server.description,
      status: server.status,
      amount: server.amount,
      updatedAt: server.updatedAt,
    };
  }

  /** Merge profile data: user preferences win, verification/rating from server */
  mergeProfileData(clientData: unknown, serverData: unknown): unknown {
    const client = clientData as ProfileData;
    const server = serverData as ProfileData;
    return {
      ...server,
      name: client.name || server.name,
      phone: client.phone || server.phone,
      bio: client.bio || server.bio,
      // Merge skills as union set
      skills: Array.from(new Set([
        ...(server.skills || []),
        ...(client.skills || []),
      ])),
      // Server wins for verification status
      isVerified: server.isVerified,
      rating: server.rating,
      completedJobs: server.completedJobs,
    };
  }
}
