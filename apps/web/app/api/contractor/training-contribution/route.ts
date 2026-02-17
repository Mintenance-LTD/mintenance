/**
 * Contractor Training Contribution API
 * Handles image uploads from contractors for AI training
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getUser } from '@/lib/auth';
import { SAM3Service } from '@/lib/services/building-surveyor/SAM3Service';
import crypto from 'crypto';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is a contractor
    const supabase = serverSupabase;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can contribute training data' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const category = formData.get('category') as string;

    if (!imageFile || !category) {
      return NextResponse.json(
        { error: 'Image and category are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are accepted.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Upload image to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${
      imageFile.type.split('/')[1]
    }`;

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('training-images')
      .upload(fileName, buffer, {
        contentType: imageFile.type,
        upsert: false
      });

    if (uploadError) {
      logger.error('Upload error:', uploadError, { service: 'api' });
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('training-images')
      .getPublicUrl(fileName);

    // Process with SAM3 for segmentation
    let segmentationData: { masks: unknown; boxes: unknown; scores: unknown; num_instances: number; areas: number[] } | null = null;
    try {
      if (process.env.ENABLE_SAM3_SEGMENTATION === 'true') {
        segmentationData = await processWithSAM3(publicUrl) as { masks: unknown; boxes: unknown; scores: unknown; num_instances: number; areas: number[] };
      }
    } catch (error) {
      logger.error('SAM3 processing failed:', error, { service: 'api' });
      // Continue without segmentation
    }

    // Save contribution to database
    const assessmentId = crypto.randomUUID();

    // Save to training labels
    const { error: labelError } = await supabase
      .from('maintenance_training_labels')
      .insert({
        assessment_id: assessmentId,
        image_urls: [publicUrl],
        issue_type: category,
        confidence: 100, // Contractor-labeled = high confidence
        response_quality: 'high',
        human_verified: true,
        verified_by: user.id,
        verified_at: new Date().toISOString()
      });

    if (labelError) {
      logger.error('Label save error:', labelError, { service: 'api' });
      throw labelError;
    }

    // Save segmentation if available
    if (segmentationData) {
      await supabase.from('maintenance_segmentation_masks').insert({
        assessment_id: assessmentId,
        image_url: publicUrl,
        damage_type: category,
        masks: segmentationData.masks,
        boxes: segmentationData.boxes,
        scores: segmentationData.scores,
        num_instances: segmentationData.num_instances,
        total_affected_area: segmentationData.areas?.[0] || 0,
        human_verified: true,
        verified_by: user.id,
        verified_at: new Date().toISOString()
      });
    }

    // Update contributor statistics
    await updateContributorStats(user.id);

    // Check for rewards
    const rewards = await checkAndAwardRewards(user.id);

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: publicUrl,
      assessmentId,
      rewards
    });

  } catch (error) {
    logger.error('Training contribution error:', error, { service: 'api' });
    return NextResponse.json(
      { error: 'Failed to process contribution' },
      { status: 500 }
    );
  }
}

/**
 * Get contributor statistics
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = serverSupabase;

    // Get contributor stats
    const { data: stats, error } = await supabase.rpc('get_contractor_stats', {
      contractor_uuid: user.id
    });

    if (error) {
      throw error;
    }

    // Get recent contributions
    const { data: recent } = await supabase
      .from('maintenance_training_labels')
      .select('id, issue_type, created_at')
      .eq('verified_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: stats?.[0] || {
        total_contributions: 0,
        quality_score: 0,
        credits_earned: 0,
        level: 'bronze',
        next_level_requirements: 'Silver: 50 verified contributions'
      },
      recentContributions: recent || []
    });

  } catch (error) {
    logger.error('Get stats error:', error, { service: 'api' });
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}

/**
 * Process image with SAM3 for segmentation
 */
async function processWithSAM3(imageUrl: string): Promise<unknown> {
  try {
    const response = await fetch(`${process.env.SAM3_SERVICE_URL}/segment_maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        mode: 'everything',
        min_mask_region_area: 100
      })
    });

    if (!response.ok) {
      throw new Error('SAM3 segmentation failed');
    }

    const result = await response.json();

    if (result.damage_areas && result.damage_areas.length > 0) {
      // Use the most likely damage area
      const primaryArea = result.damage_areas[0];
      return {
        masks: [primaryArea.mask],
        boxes: [[primaryArea.bbox[0], primaryArea.bbox[1], primaryArea.bbox[2], primaryArea.bbox[3]]],
        scores: [primaryArea.score],
        num_instances: 1,
        areas: [primaryArea.area]
      };
    }

    return null;

  } catch (error) {
    logger.error('SAM3 processing error:', error, { service: 'api' });
    return null;
  }
}

/**
 * Update contributor statistics
 */
async function updateContributorStats(contractorId: string): Promise<void> {
  const supabase = serverSupabase;

  try {
    // Get current stats
    const { data: current } = await supabase
      .from('contractor_contributions')
      .select('images_contributed, credits_earned')
      .eq('contractor_id', contractorId)
      .single();

    if (!current) {
      // Create new record
      await supabase.from('contractor_contributions').insert({
        contractor_id: contractorId,
        images_contributed: 1,
        credits_earned: 5
      });
    } else {
      // Update existing
      await supabase
        .from('contractor_contributions')
        .update({
          images_contributed: current.images_contributed + 1,
          credits_earned: current.credits_earned + 5,
          updated_at: new Date().toISOString()
        })
        .eq('contractor_id', contractorId);
    }

  } catch (error) {
    logger.error('Failed to update stats:', error, { service: 'api' });
  }
}

/**
 * Check and award rewards based on contribution milestones
 */
async function checkAndAwardRewards(contractorId: string): Promise<{
  creditsEarned: number;
  milestone?: string;
  bonus?: number;
}> {
  const supabase = serverSupabase;

  const { data: stats } = await supabase
    .from('contractor_contributions')
    .select('images_contributed, credits_earned')
    .eq('contractor_id', contractorId)
    .single();

  if (!stats) {
    return { creditsEarned: 5 };
  }

  const response: {
    creditsEarned: number;
    milestone?: string;
    bonus?: number;
  } = {
    creditsEarned: 5
  };

  // Check for milestones
  const totalImages = stats.images_contributed;

  if (totalImages === 10) {
    response.milestone = 'First 10 images!';
    response.bonus = 10;
  } else if (totalImages === 50) {
    response.milestone = 'Silver contributor!';
    response.bonus = 50;
  } else if (totalImages === 100) {
    response.milestone = '100 images - 3 months premium earned!';
    response.bonus = 100;

    // Grant premium subscription
    await grantPremiumSubscription(contractorId, 3);
  } else if (totalImages === 200) {
    response.milestone = 'Gold contributor!';
    response.bonus = 200;
  } else if (totalImages === 500) {
    response.milestone = 'Expert contributor!';
    response.bonus = 500;
  }

  // Update credits if bonus
  if (response.bonus) {
    await supabase
      .from('contractor_contributions')
      .update({
        credits_earned: stats.credits_earned + response.bonus,
        updated_at: new Date().toISOString()
      })
      .eq('contractor_id', contractorId);
  }

  return response;
}

/**
 * Grant premium subscription
 */
async function grantPremiumSubscription(
  contractorId: string,
  months: number
): Promise<void> {
  const supabase = serverSupabase;

  try {
    // Update contractor contributions record
    await supabase
      .from('contractor_contributions')
      .update({
        premium_months_earned: months,
        last_reward_date: new Date().toISOString()
      })
      .eq('contractor_id', contractorId);

    // TODO: Integrate with subscription system

  } catch (error) {
    logger.error('Failed to grant premium:', error, { service: 'api' });
  }
}
