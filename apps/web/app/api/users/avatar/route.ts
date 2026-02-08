/**
 * User Avatar API Route
 * GET /api/users/avatar - Get user avatar URL
 * POST /api/users/avatar - Upload user avatar
 * DELETE /api/users/avatar - Delete user avatar
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';

/**
 * GET /api/users/avatar
 * Get user avatar URL
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const supabase = serverSupabase;

    // Get user profile with avatar
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Failed to get user avatar:', error);
      throw error;
    }

    return NextResponse.json({
      avatar_url: profile?.avatar_url || null
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * POST /api/users/avatar
 * Upload user avatar
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const supabase = serverSupabase;

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logger.error('Failed to upload avatar:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      // Try to delete uploaded file
      await supabase.storage.from('avatars').remove([fileName]);
      logger.error('Failed to update user profile:', updateError);
      throw updateError;
    }

    // Delete old avatar if exists
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (oldProfile?.avatar_url && oldProfile.avatar_url !== publicUrl) {
      const oldFileName = oldProfile.avatar_url.split('/').pop();
      if (oldFileName) {
        await supabase.storage.from('avatars').remove([oldFileName]);
      }
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * DELETE /api/users/avatar
 * Delete user avatar
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const supabase = serverSupabase;

    // Get current avatar URL
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Failed to get user profile:', fetchError);
      throw fetchError;
    }

    if (profile?.avatar_url) {
      // Extract filename from URL
      const fileName = profile.avatar_url.split('/').pop();

      if (fileName) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([fileName]);

        if (deleteError) {
          logger.error('Failed to delete avatar file:', deleteError);
        }
      }
    }

    // Update user profile to remove avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Failed to update user profile:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar deleted successfully'
    });

  } catch (error) {
    return handleAPIError(error);
  }
}