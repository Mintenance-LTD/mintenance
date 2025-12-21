import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { requireCSRF } from '@/lib/csrf-validator';
import { sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';

// Type definition for profile update data
interface ProfileUpdateData {
  first_name: string;
  last_name: string;
  bio: string;
  city: string;
  country: string;
  phone: string;
  company_name: string | null;
  license_number: string | null;
  is_available: boolean;
  updated_at: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  profile_image_url?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Geocoding service for converting city/country to coordinates
class GeocodingService {
  private apiKey = process.env.GOOGLE_MAPS_API_KEY;

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    if (!this.apiKey) {
      logger.warn('GOOGLE_MAPS_API_KEY not configured; geocoding will be skipped', {
        service: 'geocoding',
      });
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results?.length) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
        };
      }

      logger.error('Geocoding failed', new Error(`Geocoding status: ${data.status}`), {
        service: 'geocoding',
        status: data.status,
      });
      return null;
    } catch (error) {
      logger.error('Geocoding API error', error, {
        service: 'geocoding',
      });
      return null;
    }
  }
}

// Profile image security configuration
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Normalize phone number to UK format required by database constraint
 * Database expects: ^(\+44|0)[0-9]{10}$
 * - Starts with +44 or 0
 * - Followed by exactly 10 digits
 * Examples:
 * - +44 1234 567890 -> +441234567890
 * - 01234 567890 -> 01234567890
 * - 44 1234 567890 -> +441234567890
 * - 1234 567890 -> 01234567890
 */
function normalizePhoneToUKFormat(phone: string | undefined | null): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }

  // Remove all non-digit characters except + at the start
  let cleaned = trimmed.replace(/[^\d+]/g, '');
  
  // If starts with +, preserve it
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.substring(1); // Remove + for processing
  }

  // Extract only digits
  const digits = cleaned.replace(/\D/g, '');

  // If empty after cleaning, return null
  if (!digits || digits.length === 0) {
    return null;
  }

  // Handle UK numbers
  // Case 1: Already in +44 format (12 digits starting with 44)
  if (digits.startsWith('44') && digits.length === 12) {
    return `+44${digits.substring(2)}`;
  }

  // Case 2: Already in 0 format (11 digits starting with 0)
  if (digits.startsWith('0') && digits.length === 11) {
    return digits;
  }

  // Case 3: Has 10 digits - assume UK number and add 0 prefix
  if (digits.length === 10) {
    return `0${digits}`;
  }

  // Case 4: Has 11 digits but doesn't start with 0
  // Might be 44XXXXXXXXXX format (international without +)
  if (digits.length === 11 && digits.startsWith('44')) {
    return `+44${digits.substring(2)}`;
  }

  // Case 5: Has 12 digits but doesn't start with 44
  // Might be 0XXXXXXXXXX with extra digit, try to fix
  if (digits.length === 12 && !digits.startsWith('44')) {
    // If starts with 0, take first 11 digits
    if (digits.startsWith('0')) {
      return digits.substring(0, 11);
    }
  }

  // Case 6: Has 13 digits starting with 44 (might have extra leading digit)
  if (digits.length === 13 && digits.startsWith('44')) {
    // Remove first digit if it's a leading 0 or 1
    if (digits[2] === '0' || digits[2] === '1') {
      return `+44${digits.substring(3)}`;
    }
    return `+44${digits.substring(2, 12)}`; // Take 10 digits after 44
  }

  // Return null if can't normalize (will be rejected by validation)
  return null;
}

// Profile update validation schema
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  bio: z.union([z.string().max(1000, 'Bio must be less than 1000 characters'), z.literal('')]).optional(),
  city: z.union([z.string().max(100, 'City must be less than 100 characters'), z.literal('')]).optional(),
  country: z.union([z.string().max(100, 'Country must be less than 100 characters'), z.literal('')]).optional(),
  phone: z.union([
    // Accept flexible input format (will be normalized before saving)
    z.string().regex(/^[\d\s\-()+]+$/, 'Invalid phone number format'),
    z.literal(''),
  ]).optional(),
  companyName: z.union([z.string().max(255, 'Company name must be less than 255 characters'), z.literal('')]).optional(),
  licenseNumber: z.union([z.string().max(100, 'License number must be less than 100 characters'), z.literal('')]).optional(),
  isAvailable: z.boolean(),
});

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
    // Rate limiting - prevent profile update abuse
    const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.api);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for profile update', {
        service: 'contractor',
        endpoint: '/api/contractor/update-profile',
      });
      return rateLimitResult.response!;
    }

    // CSRF protection - prevent cross-site attacks
    if (!(await requireCSRF(request))) {
      logger.warn('CSRF validation failed for profile update', {
        service: 'contractor',
        endpoint: '/api/contractor/update-profile',
      });
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Get current user
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      logger.warn('Unauthorized profile update attempt', {
        service: 'contractor',
        endpoint: '/api/contractor/update-profile',
        userId: user?.id,
      });
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in as contractor.' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();

    // Helper to convert empty strings to undefined for optional fields
    const getOptionalField = (value: FormDataEntryValue | null): string | undefined => {
      const str = (value as string) || '';
      return str.trim() === '' ? undefined : str.trim();
    };

    const rawData = {
      firstName: ((formData.get('firstName') as string) || '').trim(),
      lastName: ((formData.get('lastName') as string) || '').trim(),
      bio: getOptionalField(formData.get('bio')),
      city: getOptionalField(formData.get('city')),
      country: getOptionalField(formData.get('country')),
      phone: getOptionalField(formData.get('phone')),
      companyName: getOptionalField(formData.get('companyName')),
      licenseNumber: getOptionalField(formData.get('licenseNumber')),
      isAvailable: formData.get('isAvailable') === 'true',
    };

    // Extract coordinates and address if provided from Places Autocomplete
    const latitudeStr = formData.get('latitude') as string | null;
    const longitudeStr = formData.get('longitude') as string | null;
    const address = formData.get('address') as string | null;
    
    const providedLatitude = latitudeStr ? parseFloat(latitudeStr) : undefined;
    const providedLongitude = longitudeStr ? parseFloat(longitudeStr) : undefined;

    // Validate and sanitize input
    let validatedData;
    try {
      validatedData = profileUpdateSchema.parse(rawData);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn('Profile update validation failed', {
          service: 'contractor',
          userId: user.id,
          validationErrors: validationError.issues,
          rawData,
        });
        return NextResponse.json(
          { error: 'Invalid input data', details: validationError.issues },
          { status: 400 }
        );
      }
      logger.error('Unexpected validation error', validationError, {
        service: 'contractor',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    // Sanitize text inputs
    const firstName = sanitizeText(validatedData.firstName, 50);
    const lastName = sanitizeText(validatedData.lastName, 50);
    const bio = validatedData.bio ? sanitizeText(validatedData.bio, 1000) : '';
    const city = validatedData.city ? sanitizeText(validatedData.city, 100) : '';
    const country = validatedData.country ? sanitizeText(validatedData.country, 100) : '';
    
    // Normalize phone to UK format required by database constraint
    const normalizedPhone = normalizePhoneToUKFormat(validatedData.phone);

    // Validate normalized phone format matches database constraint
    if (normalizedPhone && !/^(\+44|0)[0-9]{10}$/.test(normalizedPhone)) {
      logger.warn('Phone number does not match UK format after normalization', {
        service: 'contractor',
        userId: user.id,
        originalPhone: validatedData.phone,
        normalizedPhone,
      });
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use UK format (e.g., +44 1234 567890 or 01234 567890)' },
        { status: 400 }
      );
    }

    const phone = normalizedPhone || null;
    const isAvailable = validatedData.isAvailable;
    const profileImageFile = formData.get('profileImage') as File | null;

    let profileImageUrl = null;

    // Handle profile photo upload if provided
    if (profileImageFile && profileImageFile.size > 0) {
      // Validate file type - MIME type
      if (!ALLOWED_IMAGE_TYPES.includes(profileImageFile.type)) {
        logger.warn('Invalid profile image type', {
          service: 'contractor',
          userId: user.id,
          fileType: profileImageFile.type,
          fileName: profileImageFile.name,
        });
        return NextResponse.json(
          { error: 'Invalid image type. Only JPEG, PNG, and WebP images are allowed.' },
          { status: 400 }
        );
      }

      // Validate file extension
      const fileExt = profileImageFile.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
        logger.warn('Invalid profile image extension', {
          service: 'contractor',
          userId: user.id,
          fileExtension: fileExt,
          fileName: profileImageFile.name,
        });
        return NextResponse.json(
          { error: 'Invalid file extension. Only jpg, jpeg, png, and webp are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size
      if (profileImageFile.size > MAX_IMAGE_SIZE) {
        logger.warn('Profile image size exceeded', {
          service: 'contractor',
          userId: user.id,
          fileSize: profileImageFile.size,
          maxSize: MAX_IMAGE_SIZE,
        });
        return NextResponse.json(
          { error: 'Profile image must be less than 5MB' },
          { status: 400 }
        );
      }

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
        logger.error('Upload error', uploadError, {
          service: 'contractor',
          userId: user.id,
          fileName: profileImageFile.name,
          filePath,
        });
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
    const updateData: ProfileUpdateData = {
      first_name: firstName,
      last_name: lastName,
      bio,
      city,
      country,
      phone,
      company_name: rawData.companyName || null,
      license_number: rawData.licenseNumber ? rawData.licenseNumber.trim().toUpperCase() : null,
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    };

    // Geocode city/country to get coordinates for map display
    // Use provided coordinates if available from Places Autocomplete, otherwise geocode
    if (city || country || providedLatitude !== undefined || providedLongitude !== undefined) {
      // Use provided coordinates if available (from Places Autocomplete)
      if (providedLatitude !== undefined && providedLongitude !== undefined && 
          !isNaN(providedLatitude) && !isNaN(providedLongitude)) {
        updateData.latitude = providedLatitude;
        updateData.longitude = providedLongitude;
        if (address) {
          updateData.address = address;
        }
        logger.info('Using provided coordinates from Places Autocomplete', {
          service: 'contractor',
          userId: user.id,
          city,
          country,
          latitude: providedLatitude,
          longitude: providedLongitude,
        });
      } else {
        // Fallback to geocoding if coordinates not provided
        // Build address string for geocoding
        const addressParts = [];
        if (city) addressParts.push(city);
        if (country) addressParts.push(country);
        const fullAddress = addressParts.join(', ');

        if (fullAddress) {
          try {
            const geocodingService = new GeocodingService();
            const coordinates = await geocodingService.geocodeAddress(fullAddress);

            if (coordinates) {
              updateData.latitude = coordinates.lat;
              updateData.longitude = coordinates.lng;
              // Also update address field with formatted address if available
              if (coordinates.formattedAddress) {
                updateData.address = coordinates.formattedAddress;
              }
              logger.info('Geocoded contractor location', {
                service: 'contractor',
                userId: user.id,
                city,
                country,
                latitude: coordinates.lat,
                longitude: coordinates.lng,
              });
            } else {
              logger.warn('Failed to geocode contractor location', {
                service: 'contractor',
                userId: user.id,
                address: fullAddress,
              });
            }
          } catch (geocodeError) {
            logger.error('Error geocoding contractor location', geocodeError, {
              service: 'contractor',
              userId: user.id,
              address: fullAddress,
            });
            // Continue without coordinates - contractor can still update profile
          }
        }
      }
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
      logger.error('Update error', {
        service: 'contractor',
        userId: user.id,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        updateData: Object.keys(updateData),
      });
      return NextResponse.json(
        { 
          error: 'Failed to update profile',
          details: error.message || 'Database update failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Profile update error', error, {
      service: 'contractor',
      endpoint: '/api/contractor/update-profile',
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

