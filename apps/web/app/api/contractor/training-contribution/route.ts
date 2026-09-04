/**
 * Contractor Training Contribution API
 * Handles image uploads from contractors for AI training
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import crypto from 'crypto';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  validateImageUpload,
  MAX_FILE_SIZES,
} from '@/lib/utils/fileValidation';

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const category = formData.get('category') as string;

    if (!imageFile || !category) {
      return NextResponse.json({ error: 'Image and category are required' }, { status: 400 });
    }

    const validation = await validateImageUpload(
      imageFile,
      MAX_FILE_SIZES.jobPhoto
    );
    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error || 'Invalid image file',
      }, { status: 400 });
    }

    const fileExt = validation.detectedType?.split('/')[1] || 'jpg';
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await serverSupabase.storage
      .from('training-images')
      .upload(fileName, buffer, {
        contentType: validation.detectedType,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Upload error:', uploadError, { service: 'api' });
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    const { data: { publicUrl } } = serverSupabase.storage.from('training-images').getPublicUrl(fileName);

    // Process with SAM3 for segmentation
    let segmentationData: { masks: unknown; boxes: unknown; scores: unknown; num_instances: number; areas: number[] } | null = null;
    try {
      if (process.env.ENABLE_SAM3_SEGMENTATION === 'true') {
        segmentationData = await processWithSAM3(publicUrl) as { masks: unknown; boxes: unknown; scores: unknown; num_instances: number; areas: number[] };
      }
    } catch (error) {
      logger.error('SAM3 processing failed:', error, { service: 'api' });
    }

    const assessmentId = crypto.randomUUID();

    const { error: labelError } = await serverSupabase
      .from('maintenance_training_labels')
      .insert({
        assessment_id: assessmentId,
        image_urls: [publicUrl],
        issue_type: category,
        // This is an authenticated contractor submission, not an
        // independently reviewed label. Keep it out of verified training
        // sets until an authorised reviewer confirms it.
        confidence: null,
        response_quality: 'uncertain',
        human_verified: false,
        verified_by: null,
        verified_at: null,
      });

    if (labelError) {
      await serverSupabase.storage.from('training-images').remove([fileName]);
      logger.error('Label save error:', labelError, { service: 'api' });
      throw labelError;
    }

    if (segmentationData) {
      await serverSupabase.from('maintenance_segmentation_masks').insert({
        assessment_id: assessmentId,
        image_url: publicUrl,
        damage_type: category,
        masks: segmentationData.masks,
        boxes: segmentationData.boxes,
        scores: segmentationData.scores,
        num_instances: segmentationData.num_instances,
        total_affected_area: segmentationData.areas?.[0] || 0,
        human_verified: false,
        verified_by: null,
        verified_at: null,
      });
    }

    await updateContributorStats(user.id);
    const rewards = await checkAndAwardRewards(user.id);

    return NextResponse.json({ success: true, message: 'Image uploaded successfully', imageUrl: publicUrl, assessmentId, rewards });
  }
);

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: stats, error } = await serverSupabase.rpc('get_contractor_stats', { contractor_uuid: user.id });
    if (error) throw error;

    const { data: recent } = await serverSupabase
      .from('maintenance_training_labels')
      .select('id, issue_type, created_at')
      .eq('verified_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: stats?.[0] || { total_contributions: 0, quality_score: 0, credits_earned: 0, level: 'bronze', next_level_requirements: 'Silver: 50 verified contributions' },
      recentContributions: recent || [],
    });
  }
);

async function processWithSAM3(imageUrl: string): Promise<unknown> {
  try {
    const response = await fetch(`${process.env.SAM3_SERVICE_URL}/segment_maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, mode: 'everything', min_mask_region_area: 100 }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) throw new Error('SAM3 segmentation failed');

    const result = await response.json();

    if (result.damage_areas && result.damage_areas.length > 0) {
      const primaryArea = result.damage_areas[0];
      return {
        masks: [primaryArea.mask],
        boxes: [[primaryArea.bbox[0], primaryArea.bbox[1], primaryArea.bbox[2], primaryArea.bbox[3]]],
        scores: [primaryArea.score],
        num_instances: 1,
        areas: [primaryArea.area],
      };
    }

    return null;
  } catch (error) {
    logger.error('SAM3 processing error:', error, { service: 'api' });
    return null;
  }
}

async function updateContributorStats(contractorId: string): Promise<void> {
  try {
    const { error } = await serverSupabase.rpc(
      'increment_contractor_contribution_stats',
      {
        p_contractor_id: contractorId,
        p_images: 1,
        p_credits: 5,
      }
    );
    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error('Failed to update stats:', error, { service: 'api' });
  }
}

async function checkAndAwardRewards(contractorId: string): Promise<{ creditsEarned: number; milestone?: string; bonus?: number }> {
  const { data: stats } = await serverSupabase
    .from('contractor_contributions')
    .select('images_contributed, credits_earned')
    .eq('contractor_id', contractorId)
    .single();

  if (!stats) return { creditsEarned: 5 };

  const response: { creditsEarned: number; milestone?: string; bonus?: number } = { creditsEarned: 5 };
  const totalImages = stats.images_contributed;

  if (totalImages === 10) { response.milestone = 'First 10 images!'; response.bonus = 10; }
  else if (totalImages === 50) { response.milestone = 'Silver contributor!'; response.bonus = 50; }
  else if (totalImages === 100) { response.milestone = '100 images - 3 months premium earned!'; response.bonus = 100; await grantPremiumSubscription(contractorId, 3); }
  else if (totalImages === 200) { response.milestone = 'Gold contributor!'; response.bonus = 200; }
  else if (totalImages === 500) { response.milestone = 'Expert contributor!'; response.bonus = 500; }

  if (response.bonus) {
    await serverSupabase.from('contractor_contributions').update({ credits_earned: stats.credits_earned + response.bonus, updated_at: new Date().toISOString() }).eq('contractor_id', contractorId);
  }

  return response;
}

async function grantPremiumSubscription(contractorId: string, months: number): Promise<void> {
  try {
    await serverSupabase.from('contractor_contributions').update({ premium_months_earned: months, last_reward_date: new Date().toISOString() }).eq('contractor_id', contractorId);
  } catch (error) {
    logger.error('Failed to grant premium:', error, { service: 'api' });
  }
}
