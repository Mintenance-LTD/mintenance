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

// =============================================
// USER TYPE CONVERSION
// =============================================

/**
 * Convert database user to application user
 */
export function convertDatabaseUserToUser(dbUser: any): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.first_name || dbUser.firstName,
    lastName: dbUser.last_name || dbUser.lastName,
    role: dbUser.role,
    createdAt: dbUser.created_at || dbUser.createdAt,
    updatedAt: dbUser.updated_at || dbUser.updatedAt,
    latitude: dbUser.latitude,
    longitude: dbUser.longitude,
    address: dbUser.address,
    profileImageUrl: dbUser.profile_image_url || dbUser.profileImageUrl,
    bio: dbUser.bio,
    rating: dbUser.rating,
    totalJobsCompleted: dbUser.total_jobs_completed || dbUser.totalJobsCompleted,
    isAvailable: dbUser.is_available || dbUser.isAvailable,
    isVerified: dbUser.is_verified || dbUser.isVerified,
    phone: dbUser.phone
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
export function convertDatabaseJobToJob(dbJob: any): Job {
  return {
    id: dbJob.id,
    title: dbJob.title,
    description: dbJob.description,
    location: dbJob.location,
    homeownerId: dbJob.homeowner_id || dbJob.homeownerId,
    contractorId: dbJob.contractor_id || dbJob.contractorId,
    status: dbJob.status,
    budget: dbJob.budget,
    createdAt: dbJob.created_at || dbJob.createdAt,
    updatedAt: dbJob.updated_at || dbJob.updatedAt,
    category: dbJob.category,
    subcategory: dbJob.subcategory,
    priority: dbJob.priority,
    photos: dbJob.photos,
    // Convert related entities if present
    homeowner: dbJob.homeowner ? convertDatabaseUserToUser(dbJob.homeowner) : undefined,
    contractor: dbJob.contractor ? convertDatabaseUserToUser(dbJob.contractor) : undefined,
    bids: dbJob.bids ? dbJob.bids.map(convertDatabaseBidToBid) : undefined
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
export function convertDatabaseMessageToMessage(dbMessage: any): Message {
  return {
    id: dbMessage.id,
    jobId: dbMessage.job_id || dbMessage.jobId,
    senderId: dbMessage.sender_id || dbMessage.senderId,
    receiverId: dbMessage.receiver_id || dbMessage.receiverId,
    messageText: dbMessage.message_text || dbMessage.messageText,
    messageType: dbMessage.message_type || dbMessage.messageType,
    attachmentUrl: dbMessage.attachment_url || dbMessage.attachmentUrl,
    read: dbMessage.read,
    createdAt: dbMessage.created_at || dbMessage.createdAt,
    syncedAt: dbMessage.synced_at || dbMessage.syncedAt,
    callId: dbMessage.call_id || dbMessage.callId,
    callDuration: dbMessage.call_duration || dbMessage.callDuration,
    // Convert related entities if present
    sender: dbMessage.sender ? convertDatabaseUserToUser(dbMessage.sender) : undefined,
    receiver: dbMessage.receiver ? convertDatabaseUserToUser(dbMessage.receiver) : undefined,
    job: dbMessage.job ? convertDatabaseJobToJob(dbMessage.job) : undefined,
    // Computed fields
    senderName: dbMessage.sender ?
      `${dbMessage.sender.first_name || ''} ${dbMessage.sender.last_name || ''}`.trim() :
      undefined,
    senderRole: dbMessage.sender?.role
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
export function convertDatabaseBidToBid(dbBid: any): Bid {
  return {
    id: dbBid.id,
    jobId: dbBid.job_id || dbBid.jobId,
    contractorId: dbBid.contractor_id || dbBid.contractorId,
    amount: dbBid.amount,
    description: dbBid.description,
    status: dbBid.status,
    createdAt: dbBid.created_at || dbBid.createdAt,
    updatedAt: dbBid.updated_at || dbBid.updatedAt,
    // Computed fields from joined data
    contractorName: dbBid.contractor ?
      `${dbBid.contractor.first_name || ''} ${dbBid.contractor.last_name || ''}`.trim() :
      undefined,
    contractorEmail: dbBid.contractor?.email,
    contractorRating: dbBid.contractor?.rating,
    jobTitle: dbBid.job?.title,
    jobDescription: dbBid.job?.description,
    jobLocation: dbBid.job?.location,
    jobBudget: dbBid.job?.budget
  };
}

// =============================================
// ARRAY CONVERSION UTILITIES
// =============================================

/**
 * Convert array of database users to application users
 */
export function convertDatabaseUsersToUsers(dbUsers: any[]): User[] {
  return dbUsers.map(convertDatabaseUserToUser);
}

/**
 * Convert array of database jobs to application jobs
 */
export function convertDatabaseJobsToJobs(dbJobs: any[]): Job[] {
  return dbJobs.map(convertDatabaseJobToJob);
}

/**
 * Convert array of database messages to application messages
 */
export function convertDatabaseMessagesToMessages(dbMessages: any[]): Message[] {
  return dbMessages.map(convertDatabaseMessageToMessage);
}

/**
 * Convert array of database bids to application bids
 */
export function convertDatabaseBidsToBids(dbBids: any[]): Bid[] {
  return dbBids.map(convertDatabaseBidToBid);
}

// =============================================
// GENERIC CONVERSION UTILITIES
// =============================================

/**
 * Convert any database entity to application entity
 */
export function convertDatabaseEntity(dbEntity: any, entityType: string): any {
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

/**
 * Convert application entity to database entity
 */
export function convertApplicationEntity(appEntity: any, entityType: string): any {
  switch (entityType) {
    case 'user':
      return convertUserToDatabaseUser(appEntity);
    case 'job':
      return convertJobToDatabaseJob(appEntity);
    case 'message':
      return convertMessageToDatabaseMessage(appEntity);
    default:
      return appEntity;
  }
}

// =============================================
// VALIDATION HELPERS
// =============================================

/**
 * Ensure proper field names based on context
 */
export function normalizeFieldNames(obj: any, targetFormat: 'snake_case' | 'camelCase'): any {
  if (!obj || typeof obj !== 'object') return obj;

  const normalized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    let normalizedKey = key;

    if (targetFormat === 'snake_case') {
      // Convert camelCase to snake_case
      normalizedKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    } else {
      // Convert snake_case to camelCase
      normalizedKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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