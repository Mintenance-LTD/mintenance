/**
 * Field Mapping Utilities
 * Standardized conversion between database (snake_case) and application (camelCase) fields
 */

// =============================================
// FIELD CONVERSION UTILITIES
// =============================================

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  if (!str) return str;

  let result = str;
  let leadingUnderscores = '';
  let trailingUnderscores = '';

  // Extract leading underscores
  const leadingMatch = result.match(/^_+/);
  if (leadingMatch) {
    // If it starts with double underscores, keep one
    if (leadingMatch[0].startsWith('__')) {
      leadingUnderscores = '_';
    }
    // If it starts with single underscore, remove it (standard behavior)
    result = result.slice(leadingMatch[0].length);
  }

  // Extract trailing underscores
  const trailingMatch = result.match(/_+$/);
  if (trailingMatch) {
    // If it ends with double underscores, keep one
    if (trailingMatch[0].startsWith('__')) {
      trailingUnderscores = '_';
    } else {
      trailingUnderscores = trailingMatch[0];
    }
    result = result.slice(0, -trailingMatch[0].length);
  }

  // Convert multiple internal underscores to single underscores
  result = result.replace(/__+/g, '_');

  // Apply camelCase conversion to parts between underscores
  result = result.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

  // Reassemble with preserved underscores
  result = leadingUnderscores + result + trailingUnderscores;

  return result;
}

/**
 * Convert camelCase string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function keysToCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamelCase);
  if (typeof obj !== 'object') return obj;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = keysToCamelCase(value);
  }
  return result;
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function keysToSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToSnakeCase);
  if (typeof obj !== 'object') return obj;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    result[snakeKey] = keysToSnakeCase(value);
  }
  return result;
}

// =============================================
// DATABASE FIELD MAPPINGS
// =============================================

/**
 * Standard database field mappings for common entities
 */
export const DATABASE_FIELDS = {
  // User fields
  user: {
    id: 'id',
    email: 'email',
    firstName: 'first_name',
    lastName: 'last_name',
    role: 'role',
    phone: 'phone',
    profileImageUrl: 'profile_image_url',
    bio: 'bio',
    rating: 'rating',
    totalJobsCompleted: 'total_jobs_completed',
    isAvailable: 'is_available',
    latitude: 'latitude',
    longitude: 'longitude',
    address: 'address',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  
  // Job fields
  job: {
    id: 'id',
    title: 'title',
    description: 'description',
    location: 'location',
    homeownerId: 'homeowner_id',
    contractorId: 'contractor_id',
    status: 'status',
    budget: 'budget',
    category: 'category',
    subcategory: 'subcategory',
    priority: 'priority',
    photos: 'photos',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  
  // Bid fields
  bid: {
    id: 'id',
    jobId: 'job_id',
    contractorId: 'contractor_id',
    amount: 'amount',
    description: 'description',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  
  // Message fields
  message: {
    id: 'id',
    jobId: 'job_id',
    senderId: 'sender_id',
    receiverId: 'receiver_id',
    messageText: 'message_text',
    messageType: 'message_type',
    attachmentUrl: 'attachment_url',
    read: 'read',
    createdAt: 'created_at',
    syncedAt: 'synced_at',
  },
} as const;

// =============================================
// MAPPING FUNCTIONS
// =============================================

/**
 * Map database result to application entity
 */
export function mapDatabaseToApp<T extends Record<string, any>>(
  dbData: any,
  fieldMapping: Record<string, string>
): T {
  if (!dbData) return dbData;
  
  const result: Record<string, any> = {};
  
  for (const [appField, dbField] of Object.entries(fieldMapping)) {
    if (dbData.hasOwnProperty(dbField)) {
      result[appField] = dbData[dbField];
    }
  }
  
  return result as T;
}

/**
 * Map application entity to database fields
 */
export function mapAppToDatabase<T extends Record<string, any>>(
  appData: any,
  fieldMapping: Record<string, string>
): T {
  if (!appData) return appData;
  
  const result: Record<string, any> = {};
  
  for (const [appField, dbField] of Object.entries(fieldMapping)) {
    if (appData.hasOwnProperty(appField)) {
      result[dbField] = appData[appField];
    }
  }
  
  return result as T;
}

// =============================================
// SPECIFIC ENTITY MAPPERS
// =============================================

/**
 * Map database user to application user
 */
export function mapDatabaseUserToUser(dbUser: any): any {
  return mapDatabaseToApp(dbUser, DATABASE_FIELDS.user);
}

/**
 * Map application user to database user
 */
export function mapUserToDatabaseUser(user: any): any {
  return mapAppToDatabase(user, DATABASE_FIELDS.user);
}

/**
 * Map database job to application job
 */
export function mapDatabaseJobToJob(dbJob: any): any {
  return mapDatabaseToApp(dbJob, DATABASE_FIELDS.job);
}

/**
 * Map application job to database job
 */
export function mapJobToDatabaseJob(job: any): any {
  return mapAppToDatabase(job, DATABASE_FIELDS.job);
}

/**
 * Map database bid to application bid
 */
export function mapDatabaseBidToBid(dbBid: any): any {
  return mapDatabaseToApp(dbBid, DATABASE_FIELDS.bid);
}

/**
 * Map application bid to database bid
 */
export function mapBidToDatabaseBid(bid: any): any {
  return mapAppToDatabase(bid, DATABASE_FIELDS.bid);
}

/**
 * Map database message to application message
 */
export function mapDatabaseMessageToMessage(dbMessage: any): any {
  return mapDatabaseToApp(dbMessage, DATABASE_FIELDS.message);
}

/**
 * Map application message to database message
 */
export function mapMessageToDatabaseMessage(message: any): any {
  return mapAppToDatabase(message, DATABASE_FIELDS.message);
}

// =============================================
// BATCH MAPPING
// =============================================

/**
 * Map array of database entities to application entities
 */
export function mapDatabaseArrayToApp<T>(
  dbArray: any[],
  mapper: (item: any) => T
): T[] {
  return dbArray.map(mapper);
}

/**
 * Map array of application entities to database entities
 */
export function mapAppArrayToDatabase<T>(
  appArray: any[],
  mapper: (item: any) => T
): T[] {
  return appArray.map(mapper);
}

// =============================================
// VALIDATION UTILITIES
// =============================================

/**
 * Validate required fields are present
 */
export function validateRequiredFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: (keyof T)[] } {
  const missingFields: (keyof T)[] = [];
  
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Sanitize string field
 */
export function sanitizeString(value: any): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

/**
 * Sanitize number field
 */
export function sanitizeNumber(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Sanitize boolean field
 */
export function sanitizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

/**
 * Sanitize date field
 */
export function sanitizeDate(value: any): string {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}
