import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PlatformSettingsService } from '@/lib/services/admin/PlatformSettingsService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
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
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
    }

    const updated = await PlatformSettingsService.updateSetting(key, value, user.id);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }

    // Log admin activity
    await AdminActivityLogger.logFromRequest(
      request,
      user.id,
      'update_setting',
      'settings',
      `Updated platform setting: ${key}`,
      'setting',
      updated.id,
      { key, old_value: body.oldValue, new_value: value }
    );

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error updating platform setting', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value, type, category, description, isPublic } = body;

    if (!key || !value || !type || !category) {
      return NextResponse.json({ 
        error: 'key, value, type, and category are required' 
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

