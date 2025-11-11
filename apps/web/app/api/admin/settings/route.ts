import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PlatformSettingsService } from '@/lib/services/admin/PlatformSettingsService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { adminSettingUpdateSchema, adminSettingCreateSchema } from '@/lib/validation/schemas';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { requireCSRF } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/rate-limiting/admin-gdpr';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting for admin endpoints
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const category = request.nextUrl.searchParams.get('category');
    
    if (category) {
      const settings = await PlatformSettingsService.getSettingsByCategory(category as any);
      return NextResponse.json({ settings });
    }

    const settings = await PlatformSettingsService.getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    logger.error('Error fetching platform settings', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
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
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    // Get existing setting to validate value type matches
    const existing = await PlatformSettingsService.getSetting(key);
    if (!existing) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    // Validate value type matches setting type
    const valueType = typeof value;
    const expectedType = existing.setting_type;
    
    if (expectedType === 'number' && valueType !== 'number') {
      return NextResponse.json({ 
        error: `Invalid value type. Expected ${expectedType}, got ${valueType}` 
      }, { status: 400 });
    }
    
    if (expectedType === 'boolean' && valueType !== 'boolean') {
      return NextResponse.json({ 
        error: `Invalid value type. Expected ${expectedType}, got ${valueType}` 
      }, { status: 400 });
    }
    
    if (expectedType === 'string' && valueType !== 'string') {
      return NextResponse.json({ 
        error: `Invalid value type. Expected ${expectedType}, got ${valueType}` 
      }, { status: 400 });
    }
    
    if ((expectedType === 'json' || expectedType === 'array') && valueType !== 'object') {
      return NextResponse.json({ 
        error: `Invalid value type. Expected object/array, got ${valueType}` 
      }, { status: 400 });
    }

    const updated = await PlatformSettingsService.updateSetting(key, value, user.id);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
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
    logger.error('Error updating platform setting', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    // SECURITY: Verify admin role from database for sensitive operations
    try {
      await requireAdminFromDatabase(user.id);
    } catch (error) {
      logger.warn('Admin role verification failed for settings creation', {
        service: 'admin',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
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
      return NextResponse.json({ 
        error: `Invalid value type. Expected number, got ${valueType}` 
      }, { status: 400 });
    }
    
    if (type === 'boolean' && valueType !== 'boolean') {
      return NextResponse.json({ 
        error: `Invalid value type. Expected boolean, got ${valueType}` 
      }, { status: 400 });
    }
    
    if (type === 'string' && valueType !== 'string') {
      return NextResponse.json({ 
        error: `Invalid value type. Expected string, got ${valueType}` 
      }, { status: 400 });
    }
    
    if ((type === 'json' || type === 'array') && valueType !== 'object') {
      return NextResponse.json({ 
        error: `Invalid value type. Expected object/array, got ${valueType}` 
      }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 });
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
    logger.error('Error creating platform setting', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Sanitize sensitive setting values before logging
 */
function sanitizeSensitiveValue(key: string, value: any): any {
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

