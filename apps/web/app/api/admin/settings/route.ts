import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PlatformSettingsService, SettingCategory } from '@/lib/services/admin/PlatformSettingsService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { adminSettingUpdateSchema, adminSettingCreateSchema } from '@/lib/validation/schemas';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { requireCSRF } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/rate-limiting/admin-gdpr';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, RateLimitError, InternalServerError } from '@/lib/errors/api-error';

// Type for sensitive value sanitization
type SanitizableValue = string | number | boolean | Record<string, unknown> | unknown[] | null | undefined;

export async function GET(request: NextRequest) {
  try {
    // Rate limiting for admin endpoints
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedError('Admin access required');
    }

    const category = request.nextUrl.searchParams.get('category');
    
    if (category) {
      const settings = await PlatformSettingsService.getSettingsByCategory(category as SettingCategory);
      return NextResponse.json({ settings });
    }

    const settings = await PlatformSettingsService.getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Rate limiting for admin endpoints
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedError('Admin access required');
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, adminSettingUpdateSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { key, value, oldValue } = validation.data;

    // SECURITY: Verify admin role from database for sensitive operations
    try {
      await requireAdminFromDatabase(user.id);
    } catch (error) {
      logger.warn('Admin role verification failed for settings update', {
        service: 'admin',
        userId: user.id,
        key,
      });
      throw new ForbiddenError('Admin access required');
    }

    // Get existing setting to validate value type matches
    const existing = await PlatformSettingsService.getSetting(key);
    if (!existing) {
      throw new NotFoundError('Setting not found');
    }

    // Validate value type matches setting type
    const valueType = typeof value;
    const expectedType = existing.setting_type;
    
    if (expectedType === 'number' && valueType !== 'number') {
      throw new BadRequestError(`Invalid value type. Expected ${expectedType}, got ${valueType}`);
    }

    if (expectedType === 'boolean' && valueType !== 'boolean') {
      throw new BadRequestError(`Invalid value type. Expected ${expectedType}, got ${valueType}`);
    }

    if (expectedType === 'string' && valueType !== 'string') {
      throw new BadRequestError(`Invalid value type. Expected ${expectedType}, got ${valueType}`);
    }

    if ((expectedType === 'json' || expectedType === 'array') && valueType !== 'object') {
      throw new BadRequestError(`Invalid value type. Expected object/array, got ${valueType}`);
    }

    const updated = await PlatformSettingsService.updateSetting(key, value, user.id);

    if (!updated) {
      throw new InternalServerError('Failed to update setting');
    }

    // Sanitize sensitive values before logging
    const sanitizedOldValue = sanitizeSensitiveValue(key, oldValue);
    const sanitizedNewValue = sanitizeSensitiveValue(key, value);

    // Log admin activity
    await AdminActivityLogger.logFromRequest(
      request,
      user.id,
      'update_setting',
      'settings',
      `Updated platform setting: ${key}`,
      'setting',
      updated.id,
      { key, old_value: sanitizedOldValue, new_value: sanitizedNewValue }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedError('Admin access required');
    }

    // SECURITY: Verify admin role from database for sensitive operations
    try {
      await requireAdminFromDatabase(user.id);
    } catch (error) {
      logger.warn('Admin role verification failed for settings creation', {
        service: 'admin',
        userId: user.id,
      });
      throw new ForbiddenError('Admin access required');
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, adminSettingCreateSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { key, value, type, category, description, isPublic } = validation.data;

    // Validate value type matches declared type
    const valueType = typeof value;
    if (type === 'number' && valueType !== 'number') {
      throw new BadRequestError(`Invalid value type. Expected number, got ${valueType}`);
    }

    if (type === 'boolean' && valueType !== 'boolean') {
      throw new BadRequestError(`Invalid value type. Expected boolean, got ${valueType}`);
    }

    if (type === 'string' && valueType !== 'string') {
      throw new BadRequestError(`Invalid value type. Expected string, got ${valueType}`);
    }

    if ((type === 'json' || type === 'array') && valueType !== 'object') {
      throw new BadRequestError(`Invalid value type. Expected object/array, got ${valueType}`);
    }

    const created = await PlatformSettingsService.createSetting(
      key,
      value,
      type,
      category,
      description,
      isPublic || false,
      user.id
    );

    if (!created) {
      throw new InternalServerError('Failed to create setting');
    }

    // Log admin activity
    await AdminActivityLogger.logFromRequest(
      request,
      user.id,
      'create_setting',
      'settings',
      `Created platform setting: ${key}`,
      'setting',
      created.id
    );

    return NextResponse.json(created);
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * Sanitize sensitive setting values before logging
 */
function sanitizeSensitiveValue(key: string, value: SanitizableValue): SanitizableValue {
  // List of setting keys that contain sensitive information
  const sensitiveKeys = [
    'api_key',
    'secret',
    'password',
    'token',
    'credential',
    'private',
    'stripe',
    'webhook',
  ];

  const keyLower = key.toLowerCase();
  const isSensitive = sensitiveKeys.some(sensitive => keyLower.includes(sensitive));

  if (isSensitive && value) {
    if (typeof value === 'string') {
      // Mask strings longer than 8 characters
      if (value.length > 8) {
        return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
      }
      return '****';
    }
    // For objects/arrays, return masked indicator
    return '[REDACTED]';
  }

  return value;
}

