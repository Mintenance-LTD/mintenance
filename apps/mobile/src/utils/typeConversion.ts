/**
 * Type Conversion Utilities
 *
 * This file provides utilities to convert between database types (snake_case)
 * and application types (camelCase) while maintaining type safety.
 */

import {
  User,
  Job,
  Message,
  Bid,
  DatabaseUser,
  DatabaseJob,
  DatabaseMessage
} from '../types/standardized';

import {
  mapDatabaseUserToUser,
  mapUserToDatabaseUser,
  mapDatabaseJobToJob,
  mapJobToDatabaseJob,
  mapDatabaseMessageToMessage,
  mapMessageToDatabaseMessage
} from './fieldMapper';

type AnyRecord = Record<string, unknown>;

// =============================================
// USER TYPE CONVERSION
// =============================================

/**
 * Convert database user to application user
 */
export function convertDatabaseUserToUser(dbUser: AnyRecord): User {
  return {
    id: dbUser.id as string,
    email: dbUser.email as string,
    firstName: (dbUser.first_name || dbUser.firstName) as string,
    lastName: (dbUser.last_name || dbUser.lastName) as string,
    role: dbUser.role as User['role'],
    createdAt: (dbUser.created_at || dbUser.createdAt) as string,
    updatedAt: (dbUser.updated_at || dbUser.updatedAt) as string,
    latitude: dbUser.latitude as number | undefined,
    longitude: dbUser.longitude as number | undefined,
    address: dbUser.address as string | undefined,
    profileImageUrl: (dbUser.profile_image_url || dbUser.profileImageUrl) as string | undefined,
    bio: dbUser.bio as string | undefined,
    rating: dbUser.rating as number | undefined,
    totalJobsCompleted: (dbUser.total_jobs_completed ?? dbUser.totalJobsCompleted) as number | undefined,
    isAvailable: (dbUser.is_available ?? dbUser.isAvailable) as boolean | undefined,
    isVerified: (dbUser.is_verified ?? dbUser.isVerified) as boolean | undefined,
    phone: dbUser.phone as string | undefined
  };
}

/**
 * Convert application user to database user
 */
export function convertUserToDatabaseUser(user: User): DatabaseUser {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    role: user.role,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    latitude: user.latitude,
    longitude: user.longitude,
    address: user.address,
    profile_image_url: user.profileImageUrl,
    bio: user.bio,
    rating: user.rating,
    total_jobs_completed: user.totalJobsCompleted,
    is_available: user.isAvailable,
    is_verified: user.isVerified,
    phone: user.phone
  };
}

// =============================================
// JOB TYPE CONVERSION
// =============================================

/**
 * Convert database job to application job
 */
export function convertDatabaseJobToJob(dbJob: AnyRecord): Job {
  return {
    id: dbJob.id as string,
    title: dbJob.title as string,
    description: dbJob.description as string,
    location: dbJob.location as string,
    homeownerId: (dbJob.homeowner_id || dbJob.homeownerId) as string,
    contractorId: (dbJob.contractor_id || dbJob.contractorId) as string | undefined,
    status: dbJob.status as Job['status'],
    budget: dbJob.budget as number,
    createdAt: (dbJob.created_at || dbJob.createdAt) as string,
    updatedAt: (dbJob.updated_at || dbJob.updatedAt) as string,
    category: dbJob.category as string | undefined,
    subcategory: dbJob.subcategory as string | undefined,
    priority: dbJob.priority as Job['priority'],
    photos: dbJob.photos as string[] | undefined,
    // Convert related entities if present
    homeowner: dbJob.homeowner ? convertDatabaseUserToUser(dbJob.homeowner as AnyRecord) : undefined,
    contractor: dbJob.contractor ? convertDatabaseUserToUser(dbJob.contractor as AnyRecord) : undefined,
    bids: dbJob.bids ? (dbJob.bids as AnyRecord[]).map(convertDatabaseBidToBid) : undefined
  };
}

/**
 * Convert application job to database job
 */
export function convertJobToDatabaseJob(job: Job): DatabaseJob {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    homeowner_id: job.homeownerId,
    contractor_id: job.contractorId,
    status: job.status,
    budget: job.budget,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    category: job.category,
    subcategory: job.subcategory,
    priority: job.priority,
    photos: job.photos
  };
}

// =============================================
// MESSAGE TYPE CONVERSION
// =============================================

/**
 * Convert database message to application message
 */
export function convertDatabaseMessageToMessage(dbMessage: AnyRecord): Message {
  const sender = dbMessage.sender as AnyRecord | undefined;
  return {
    id: dbMessage.id as string,
    jobId: (dbMessage.job_id || dbMessage.jobId) as string,
    senderId: (dbMessage.sender_id || dbMessage.senderId) as string,
    receiverId: (dbMessage.receiver_id || dbMessage.receiverId) as string,
    messageText: (dbMessage.message_text || dbMessage.messageText) as string,
    messageType: (dbMessage.message_type || dbMessage.messageType) as Message['messageType'],
    attachmentUrl: (dbMessage.attachment_url || dbMessage.attachmentUrl) as string | undefined,
    read: dbMessage.read as boolean,
    createdAt: (dbMessage.created_at || dbMessage.createdAt) as string,
    syncedAt: (dbMessage.synced_at || dbMessage.syncedAt) as string | undefined,
    callId: (dbMessage.call_id || dbMessage.callId) as string | undefined,
    callDuration: (dbMessage.call_duration || dbMessage.callDuration) as number | undefined,
    // Convert related entities if present
    sender: sender ? convertDatabaseUserToUser(sender) : undefined,
    receiver: dbMessage.receiver ? convertDatabaseUserToUser(dbMessage.receiver as AnyRecord) : undefined,
    job: dbMessage.job ? convertDatabaseJobToJob(dbMessage.job as AnyRecord) : undefined,
    // Computed fields
    senderName: sender
      ? `${(sender.first_name as string) || ''} ${(sender.last_name as string) || ''}`.trim()
      : undefined,
    senderRole: (sender?.role as string) ?? undefined
  };
}

/**
 * Convert application message to database message
 */
export function convertMessageToDatabaseMessage(message: Message): DatabaseMessage {
  return {
    id: message.id,
    job_id: message.jobId,
    sender_id: message.senderId,
    receiver_id: message.receiverId,
    message_text: message.messageText,
    message_type: message.messageType,
    attachment_url: message.attachmentUrl,
    read: message.read,
    created_at: message.createdAt,
    synced_at: message.syncedAt,
    call_id: message.callId,
    call_duration: message.callDuration
  };
}

// =============================================
// BID TYPE CONVERSION
// =============================================

/**
 * Convert database bid to application bid
 */
export function convertDatabaseBidToBid(dbBid: AnyRecord): Bid {
  const contractor = dbBid.contractor as AnyRecord | undefined;
  const job = dbBid.job as AnyRecord | undefined;
  return {
    id: dbBid.id as string,
    jobId: (dbBid.job_id || dbBid.jobId) as string,
    contractorId: (dbBid.contractor_id || dbBid.contractorId) as string,
    amount: dbBid.amount as number,
    description: dbBid.description as string,
    status: dbBid.status as Bid['status'],
    createdAt: (dbBid.created_at || dbBid.createdAt) as string,
    updatedAt: (dbBid.updated_at || dbBid.updatedAt) as string | undefined,
    // Computed fields from joined data
    contractorName: contractor
      ? `${(contractor.first_name as string) || ''} ${(contractor.last_name as string) || ''}`.trim()
      : undefined,
    contractorEmail: contractor?.email as string | undefined,
    contractorRating: contractor?.rating as number | undefined,
    jobTitle: job?.title as string | undefined,
    jobDescription: job?.description as string | undefined,
    jobLocation: job?.location as string | undefined,
    jobBudget: job?.budget as number | undefined
  };
}

// =============================================
// ARRAY CONVERSION UTILITIES
// =============================================

export function convertDatabaseUsersToUsers(dbUsers: AnyRecord[]): User[] {
  return dbUsers.map(convertDatabaseUserToUser);
}

export function convertDatabaseJobsToJobs(dbJobs: AnyRecord[]): Job[] {
  return dbJobs.map(convertDatabaseJobToJob);
}

export function convertDatabaseMessagesToMessages(dbMessages: AnyRecord[]): Message[] {
  return dbMessages.map(convertDatabaseMessageToMessage);
}

export function convertDatabaseBidsToBids(dbBids: AnyRecord[]): Bid[] {
  return dbBids.map(convertDatabaseBidToBid);
}

// =============================================
// GENERIC CONVERSION UTILITIES
// =============================================

export function convertDatabaseEntity(dbEntity: AnyRecord, entityType: string): unknown {
  switch (entityType) {
    case 'user':
      return convertDatabaseUserToUser(dbEntity);
    case 'job':
      return convertDatabaseJobToJob(dbEntity);
    case 'message':
      return convertDatabaseMessageToMessage(dbEntity);
    case 'bid':
      return convertDatabaseBidToBid(dbEntity);
    default:
      return dbEntity;
  }
}

export function convertApplicationEntity(appEntity: unknown, entityType: string): unknown {
  switch (entityType) {
    case 'user':
      return convertUserToDatabaseUser(appEntity as User);
    case 'job':
      return convertJobToDatabaseJob(appEntity as Job);
    case 'message':
      return convertMessageToDatabaseMessage(appEntity as Message);
    default:
      return appEntity;
  }
}

// =============================================
// VALIDATION HELPERS
// =============================================

export function normalizeFieldNames(obj: unknown, targetFormat: 'snake_case' | 'camelCase'): unknown {
  if (!obj || typeof obj !== 'object') return obj;

  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    let normalizedKey = key;

    if (targetFormat === 'snake_case') {
      normalizedKey = key.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
    } else {
      const leadingUnderscores = key.match(/^_+/)?.[0] ?? '';
      const coreKey = key.slice(leadingUnderscores.length);
      normalizedKey = leadingUnderscores + coreKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    }

    normalized[normalizedKey] = value;
  }

  return normalized;
}

// =============================================
// EXPORT CONVERSION UTILITIES
// =============================================

export const TypeConversion = {
  user: {
    fromDatabase: convertDatabaseUserToUser,
    toDatabase: convertUserToDatabaseUser,
    arrayFromDatabase: convertDatabaseUsersToUsers
  },
  job: {
    fromDatabase: convertDatabaseJobToJob,
    toDatabase: convertJobToDatabaseJob,
    arrayFromDatabase: convertDatabaseJobsToJobs
  },
  message: {
    fromDatabase: convertDatabaseMessageToMessage,
    toDatabase: convertMessageToDatabaseMessage,
    arrayFromDatabase: convertDatabaseMessagesToMessages
  },
  bid: {
    fromDatabase: convertDatabaseBidToBid,
    arrayFromDatabase: convertDatabaseBidsToBids
  },
  generic: {
    fromDatabase: convertDatabaseEntity,
    toDatabase: convertApplicationEntity,
    normalizeFields: normalizeFieldNames
  }
};

export default TypeConversion;
