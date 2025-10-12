import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/contractor/update-profile
 * 
 * Updates contractor profile information including photo upload.
 * Following Single Responsibility Principle - only handles profile updates.
 * 
 * @filesize Target: <150 lines
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in as contractor.' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const bio = formData.get('bio') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;
    const phone = formData.get('phone') as string;
    const isAvailable = formData.get('isAvailable') === 'true';
    const profileImageFile = formData.get('profileImage') as File | null;

    let profileImageUrl = null;

    // Handle profile photo upload if provided
    if (profileImageFile && profileImageFile.size > 0) {
      const fileExt = profileImageFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, profileImageFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload profile image' },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      profileImageUrl = publicUrl;
    }

    // Update user profile in database
    const updateData: any = {
      first_name: firstName,
      last_name: lastName,
      bio,
      city,
      country,
      phone,
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    };

    if (city || country) {
      updateData.is_visible_on_map = true;
      updateData.last_location_visibility_at = new Date().toISOString();
    }

    if (profileImageUrl) {
      updateData.profile_image_url = profileImageUrl;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

