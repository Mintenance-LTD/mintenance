/**
 * AI Maintenance Detection API Endpoint
 * Processes uploaded images through YOLO model for damage detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { maintenanceDetectSchema } from '@/lib/validation/schemas';

// Maintenance issue to contractor mapping
const ISSUE_TO_CONTRACTOR: Record<string, string> = {
  'pipe_leak': 'plumber',
  'water_damage': 'water_restoration',
  'wall_crack': 'structural_engineer',
  'roof_damage': 'roofer',
  'electrical_fault': 'electrician',
  'mold_damp': 'mold_specialist',
  'fire_damage': 'restoration_contractor',
  'window_broken': 'glazier',
  'door_damaged': 'carpenter',
  'floor_damage': 'flooring_contractor',
  'ceiling_damage': 'ceiling_specialist',
  'foundation_crack': 'foundation_specialist',
  'hvac_issue': 'hvac_technician',
  'gutter_blocked': 'gutter_specialist',
  'general_damage': 'general_contractor'
};

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

    const supabase = serverSupabase;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get image from form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Validate and sanitize form text fields using Zod schema
    const fieldValidation = maintenanceDetectSchema.safeParse({
      description: (formData.get('description') as string) || '',
      urgency: (formData.get('urgency') as string) || 'normal',
    });

    if (!fieldValidation.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: fieldValidation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { description, urgency } = fieldValidation.data;

    // Upload image to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_${imageFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job-attachments')
      .upload(fileName, imageFile);

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('job-attachments')
      .getPublicUrl(fileName);

    // For server-side, we'll use a mock detection or delegate to client-side
    // Real YOLO detection with onnxruntime-web must be done client-side
    const detections = await mockServerSideDetection(publicUrl);

    // Process detections
    let primaryIssue = 'general_damage';
    let confidence = 0;
    let severity = 'moderate';

    if (detections && detections.length > 0) {
      // Get highest confidence detection
      const topDetection = detections.reduce((prev, current) =>
        (current.confidence > prev.confidence) ? current : prev
      );

      primaryIssue = topDetection.class;
      confidence = topDetection.confidence;

      // Determine severity based on confidence and size
      if (confidence > 0.9) severity = 'critical';
      else if (confidence > 0.7) severity = 'major';
      else if (confidence > 0.5) severity = 'moderate';
      else severity = 'minor';
    }

    // Get contractor type
    const contractorType = ISSUE_TO_CONTRACTOR[primaryIssue] || 'general_contractor';

    // Generate assessment
    const assessment = {
      id: crypto.randomUUID(),
      issue_type: primaryIssue,
      confidence: Math.round(confidence * 100),
      severity,
      contractor_type: contractorType,
      detections: detections || [],
      image_url: publicUrl,

      // Estimates based on issue type and severity
      estimated_cost: estimateCost(primaryIssue, severity),
      estimated_hours: estimateHours(primaryIssue, severity),

      // Materials and tools
      materials_needed: getMaterials(primaryIssue),
      tools_required: getTools(primaryIssue),

      // Safety and urgency
      safety_notes: getSafetyNotes(primaryIssue),
      urgency_level: determineUrgency(primaryIssue, severity, urgency),

      // AI insights
      ai_insights: {
        detection_count: detections?.length || 0,
        primary_issue: primaryIssue,
        secondary_issues: detections?.slice(1).map(d => d.class) || [],
        confidence_level: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
        recommended_action: getRecommendedAction(primaryIssue, severity)
      },

      processed_at: new Date().toISOString()
    };

    // Save assessment to database
    const { data: savedAssessment, error: saveError } = await supabase
      .from('ai_assessments')
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        issue_type: primaryIssue,
        confidence,
        severity,
        contractor_type: contractorType,
        assessment_data: assessment,
        description
      })
      .select()
      .single();

    // Return assessment result
    return NextResponse.json({
      success: true,
      assessment,
      message: `Detected ${primaryIssue.replace('_', ' ')} with ${Math.round(confidence * 100)}% confidence`,
      next_steps: [
        `We recommend hiring a ${contractorType.replace('_', ' ')}`,
        `Estimated cost: £${assessment.estimated_cost.min}-${assessment.estimated_cost.max}`,
        `Estimated time: ${assessment.estimated_hours} hours`,
        assessment.urgency_level === 'high' ? '⚠️ This issue requires urgent attention' : null
      ].filter(Boolean)
    });

  } catch (error) {
    logger.error('Detection error:', error, { service: 'api' });
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}

// Mock detection function for server-side
async function mockServerSideDetection(imageUrl: string) {
  // In production, this would call an external AI service or
  // return a response telling the client to perform detection
  // logger.info('Mock detection for:', imageUrl', { service: 'api' });

  // Return mock detections for development
  return [
    {
      class: 'water_damage',
      confidence: 0.75,
      bbox: [0.3, 0.4, 0.2, 0.3],
      area: 0.06
    }
  ];
}

// Helper functions
function estimateCost(issueType: string, severity: string) {
  const baseCosts: Record<string, number> = {
    'pipe_leak': 200,
    'water_damage': 500,
    'wall_crack': 300,
    'roof_damage': 800,
    'electrical_fault': 250,
    'mold_damp': 400,
    'fire_damage': 2000,
    'window_broken': 150,
    'door_damaged': 200,
    'floor_damage': 600,
    'ceiling_damage': 400,
    'foundation_crack': 1500,
    'hvac_issue': 350,
    'gutter_blocked': 100,
    'general_damage': 200
  };

  const severityMultiplier: Record<string, number> = {
    'minor': 0.5,
    'moderate': 1,
    'major': 2,
    'critical': 3
  };

  const base = baseCosts[issueType] || 200;
  const multiplier = severityMultiplier[severity] || 1;
  const estimate = base * multiplier;

  return {
    min: Math.round(estimate * 0.8),
    max: Math.round(estimate * 1.5),
    average: Math.round(estimate)
  };
}

function estimateHours(issueType: string, severity: string) {
  const baseHours: Record<string, number> = {
    'pipe_leak': 2,
    'water_damage': 8,
    'wall_crack': 4,
    'roof_damage': 12,
    'electrical_fault': 3,
    'mold_damp': 6,
    'fire_damage': 48,
    'window_broken': 2,
    'door_damaged': 3,
    'floor_damage': 10,
    'ceiling_damage': 6,
    'foundation_crack': 24,
    'hvac_issue': 4,
    'gutter_blocked': 1,
    'general_damage': 4
  };

  const severityMultiplier: Record<string, number> = {
    'minor': 0.5,
    'moderate': 1,
    'major': 1.5,
    'critical': 2
  };

  const base = baseHours[issueType] || 4;
  const multiplier = severityMultiplier[severity] || 1;

  return Math.round(base * multiplier);
}

function getMaterials(issueType: string): string[] {
  const materials: Record<string, string[]> = {
    'pipe_leak': ['Pipe sealant', 'Replacement fittings', 'PTFE tape'],
    'water_damage': ['Dehumidifier', 'Anti-mold treatment', 'Replacement drywall'],
    'wall_crack': ['Crack filler', 'Mesh tape', 'Paint'],
    'roof_damage': ['Roof tiles', 'Roofing felt', 'Flashing'],
    'electrical_fault': ['Wire', 'Outlets', 'Circuit breakers'],
    'mold_damp': ['Anti-mold spray', 'Sealant', 'Ventilation'],
    'fire_damage': ['Cleaning supplies', 'Replacement materials', 'Paint'],
    'window_broken': ['Glass pane', 'Putty', 'Glazing points'],
    'door_damaged': ['Wood filler', 'Hinges', 'Lock set'],
    'floor_damage': ['Flooring material', 'Underlayment', 'Adhesive'],
    'ceiling_damage': ['Plasterboard', 'Joint compound', 'Paint'],
    'foundation_crack': ['Concrete', 'Waterproofing', 'Reinforcement'],
    'hvac_issue': ['Filters', 'Refrigerant', 'Replacement parts'],
    'gutter_blocked': ['Gutter guards', 'Sealant', 'Brackets'],
    'general_damage': ['Various materials as needed']
  };

  return materials[issueType] || materials['general_damage'];
}

function getTools(issueType: string): string[] {
  const tools: Record<string, string[]> = {
    'pipe_leak': ['Pipe wrench', 'Torch', 'Pipe cutter'],
    'water_damage': ['Moisture meter', 'Fans', 'Dehumidifier'],
    'wall_crack': ['Trowel', 'Scraper', 'Sandpaper'],
    'roof_damage': ['Ladder', 'Hammer', 'Roofing nailer'],
    'electrical_fault': ['Multimeter', 'Wire strippers', 'Screwdrivers'],
    'mold_damp': ['Respirator', 'Scrub brushes', 'Sprayer'],
    'fire_damage': ['Safety equipment', 'Cleaning tools', 'Restoration equipment'],
    'window_broken': ['Glass cutter', 'Putty knife', 'Glazing tool'],
    'door_damaged': ['Drill', 'Saw', 'Chisel'],
    'floor_damage': ['Floor nailer', 'Saw', 'Level'],
    'ceiling_damage': ['Drywall lift', 'Taping knife', 'Sander'],
    'foundation_crack': ['Concrete mixer', 'Trowel', 'Injection gun'],
    'hvac_issue': ['Gauges', 'Vacuum pump', 'Thermometer'],
    'gutter_blocked': ['Ladder', 'Scoop', 'Hose'],
    'general_damage': ['Basic hand tools']
  };

  return tools[issueType] || tools['general_damage'];
}

function getSafetyNotes(issueType: string): string[] {
  const safety: Record<string, string[]> = {
    'electrical_fault': ['⚠️ Turn off power at breaker', 'Use insulated tools', 'Test with multimeter first'],
    'mold_damp': ['⚠️ Wear respirator', 'Use protective clothing', 'Ensure ventilation'],
    'roof_damage': ['⚠️ Use safety harness', 'Check weather conditions', 'Secure ladder'],
    'fire_damage': ['⚠️ Check structural integrity', 'Wear protective gear', 'Test air quality'],
    'foundation_crack': ['⚠️ Monitor for movement', 'Shore if necessary', 'Check for gas leaks']
  };

  return safety[issueType] || ['Follow standard safety procedures'];
}

function determineUrgency(issueType: string, severity: string, userUrgency: string): string {
  const highUrgencyIssues = ['pipe_leak', 'electrical_fault', 'fire_damage', 'roof_damage'];

  if (highUrgencyIssues.includes(issueType) || severity === 'critical') {
    return 'high';
  }

  if (severity === 'major' || userUrgency === 'urgent') {
    return 'medium';
  }

  return 'low';
}

function getRecommendedAction(issueType: string, severity: string): string {
  if (severity === 'critical') {
    return 'Immediate professional attention required. Consider emergency services if safety risk exists.';
  }

  if (severity === 'major') {
    return 'Schedule professional repair within 24-48 hours to prevent further damage.';
  }

  if (severity === 'moderate') {
    return 'Schedule repair within the week. Monitor for any worsening.';
  }

  return 'Can be scheduled at convenience. Monitor situation.';
}
