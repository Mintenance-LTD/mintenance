/**
 * UUID Validation Utility
 * Validates UUID format to prevent invalid input attacks
 */

import { z } from 'zod';

/**
 * UUID v4 regex pattern
 * Matches: 8-4-4-4-12 hex characters with dashes
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod schema for UUID validation
 */
export const uuidSchema = z.string().regex(UUID_V4_REGEX, 'Invalid UUID format');

/**
 * Validate a UUID string
 * @param id - The UUID string to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  return UUID_V4_REGEX.test(id);
}

/**
 * Validate UUID and throw error if invalid
 * @param id - The UUID string to validate
 * @param fieldName - Name of the field for error message
 * @throws Error if UUID is invalid
 */
export function validateUUID(id: string, fieldName: string = 'ID'): void {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
}

/**
 * Validate UUID from request params
 * @param id - The UUID string from params
 * @param fieldName - Name of the field for error message
 * @returns NextResponse with error if invalid, null if valid
 */
export function validateUUIDOrRespond(id: string, fieldName: string = 'ID') {
  if (!isValidUUID(id)) {
    return {
      error: true,
      response: {
        json: { error: `Invalid ${fieldName} format` },
        status: 400,
      },
    };
  }
  return { error: false };
}

