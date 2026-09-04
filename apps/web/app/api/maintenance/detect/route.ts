/**
 * AI Maintenance Detection API Endpoint
 * Processes uploaded images through YOLO model for damage detection
 */

import { NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { maintenanceDetectSchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Get image from form data
    const formData = await request.formData();
    const rawImage = formData.get('image');
    const imageFile =
      typeof rawImage === 'object' &&
      rawImage !== null &&
      'size' in rawImage &&
      'arrayBuffer' in rawImage
        ? rawImage
        : null;

    if (!(imageFile instanceof File)) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (imageFile.size <= 0 || imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Image must be between 1 byte and 10MB' },
        { status: 413 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG and WebP images are supported' },
        { status: 415 }
      );
    }

    // Do not trust the browser-provided MIME type. Check the file signature
    // before sending bytes to storage or any future inference service.
    const imageBytes = Buffer.from(await imageFile.arrayBuffer());
    const detectedType = await fileTypeFromBuffer(imageBytes);
    if (!detectedType || !ALLOWED_IMAGE_TYPES.has(detectedType.mime)) {
      return NextResponse.json(
        { error: 'Uploaded file is not a supported image' },
        { status: 415 }
      );
    }

    // Validate and sanitize form text fields using Zod schema
    const fieldValidation = maintenanceDetectSchema.safeParse({
      description:
        typeof formData.get('description') === 'string'
          ? formData.get('description')
          : '',
      urgency:
        typeof formData.get('urgency') === 'string'
          ? formData.get('urgency')
          : 'normal',
    });

    if (!fieldValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: fieldValidation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { description, urgency } = fieldValidation.data;

    // Upload image to Supabase Storage
    const extension = detectedType.ext === 'jpg' ? 'jpeg' : detectedType.ext;
    const fileName = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await serverSupabase.storage
      .from('job-attachments')
      .upload(fileName, imageBytes, {
        contentType: detectedType.mime,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Bucket is private — short-lived signed URL for AI inference only
    const { data: signedData, error: signedError } =
      await serverSupabase.storage
        .from('job-attachments')
        .createSignedUrl(fileName, 5 * 60);

    if (signedError || !signedData) {
      await serverSupabase.storage.from('job-attachments').remove([fileName]);
      return NextResponse.json(
        { error: 'Failed to generate image access URL' },
        { status: 500 }
      );
    }

    // Sprint 7 (1.4): real YOLO inference with onnxruntime-web runs in the
    // browser, not here — this endpoint historically called
    // `mockServerSideDetection()` which returned a hardcoded `water_damage`
    // at confidence 0.75 regardless of the image, so every caller got
    // the same fake answer. We stopped doing that. The image is still
    // uploaded + signed so the client can pick it up for its own
    // inference, but we no longer fabricate detections server-side.
    //
    // The response now tells the client `server_detection_available:false`
    // and returns zero detections. Existing frontends that expect a
    // non-empty detections array will show the "no detections" path
    // (or can fall back to /api/building-surveyor/assess for a real AI call).
    const detections: Array<{
      class: string;
      confidence: number;
      bbox: number[];
      area: number;
    }> = [];

    // Keep an explicit, non-diagnostic category for legacy database rows. It
    // must never be presented as a model prediction or used to derive a cost,
    // contractor speciality, severity, materials, or tools.
    const primaryIssue = 'unclassified';
    const confidence = 0;
    const severity = 'unknown';

    const contractorType = null;

    // Generate assessment
    const assessment = {
      id: crypto.randomUUID(),
      issue_type: primaryIssue,
      confidence: Math.round(confidence * 100),
      severity,
      contractor_type: contractorType,
      detections: detections || [],
      image_url: signedData.signedUrl,
      assessment_source: 'unavailable',
      assessment_available: false,
      estimated_cost: null,
      estimated_hours: null,
      materials_needed: [],
      tools_required: [],
      safety_notes: [
        'No automated assessment is available. Seek qualified professional advice for safety-critical issues.',
      ],
      urgency_level: urgency,

      // AI insights
      ai_insights: {
        detection_count: detections?.length || 0,
        primary_issue: null,
        secondary_issues: detections?.slice(1).map((d) => d.class) || [],
        confidence_level:
          confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
        recommended_action:
          'Create a job with the original photo and description so a qualified contractor can assess it.',
      },

      processed_at: new Date().toISOString(),
    };

    // Save assessment to database
    const { error: assessmentInsertError } = await serverSupabase
      .from('ai_assessments')
      .insert({
        user_id: user.id,
        image_url: signedData.signedUrl,
        issue_type: primaryIssue,
        confidence,
        severity,
        contractor_type: contractorType,
        assessment_data: assessment,
        description,
      })
      .select()
      .single();

    if (assessmentInsertError) {
      await serverSupabase.storage.from('job-attachments').remove([fileName]);
      throw new InternalServerError(
        'Failed to save the maintenance assessment. Please try again.'
      );
    }

    // Sprint 7 (1.4): the mock detection is gone — we no longer fabricate
    // confidence. Client is expected to run YOLO against `image_url` and
    // render the result (or fall back to /api/building-surveyor/assess).
    return NextResponse.json({
      success: true,
      server_detection_available: false,
      image_url: signedData.signedUrl,
      message:
        'Image uploaded. Server-side detection is not available for this endpoint — the client should run YOLO inference against image_url, or call /api/building-surveyor/assess for a server-rendered AI assessment.',
      assessment,
    });
  }
);
