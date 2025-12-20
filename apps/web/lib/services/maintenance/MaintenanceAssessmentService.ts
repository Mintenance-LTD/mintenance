/**
 * Maintenance Assessment Service
 * Complete pipeline for assessing maintenance issues
 */

import { MaintenanceDetectionService, type EnhancedMaintenanceDetection } from './MaintenanceDetectionService';
import { MaintenanceKnowledgeBase } from './MaintenanceKnowledgeBase';
import { serverSupabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { openai } from '@/lib/openai-client';
import crypto from 'crypto';

export interface MaintenanceAssessment {
  id: string;
  timestamp: string;

  // Issue detection
  issue_detected: string | null;
  issue_category: string | null;
  confidence: number;
  confidence_level: 'high' | 'medium' | 'low';
  severity: 'minor' | 'moderate' | 'major' | 'critical' | null;

  // Enhanced details from SAM3
  affected_area_percentage?: number;
  precise_location?: string;
  damage_boundaries?: any;
  multiple_issues?: string[];

  // Contractor routing
  contractor_type: string | null;
  urgency: 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';
  estimated_duration: string | null;

  // Materials and tools
  materials_needed: string[];
  tools_required: string[];
  specialized_equipment?: string[];

  // Cost estimate
  cost_range: {
    min: number;
    max: number;
    currency: string;
  } | null;

  // Safety and instructions
  safety_notes: string[];
  immediate_actions: string[];
  homeowner_tips: string[];

  // DIY information
  diy_possibility: 'easy' | 'medium' | 'hard' | 'professional_only' | null;
  diy_instructions?: string;

  // Processing metadata
  processing_time_ms: number;
  model_version: string;
  model_type: 'maintenance_yolo' | 'gpt4_fallback' | 'hybrid';
  segmentation_enabled: boolean;

  // User guidance
  status: 'identified' | 'need_more_info' | 'need_better_photo' | 'no_issue_detected';
  message: string;
  request_description?: boolean;
  request_new_photo?: boolean;
  photo_guidance?: string[];
  alternative_issues?: string[];
}

export interface AssessmentOptions {
  userDescription?: string;
  useSAM3?: boolean;
  useGPTFallback?: boolean;
  saveAssessment?: boolean;
  jobId?: string;
  userId?: string;
}

export class MaintenanceAssessmentService {
  /**
   * Complete assessment pipeline
   */
  static async assessMaintenanceIssue(
    images: string[],
    options: AssessmentOptions = {}
  ): Promise<MaintenanceAssessment> {
    const startTime = Date.now();
    const assessmentId = crypto.randomUUID();

    try {
      // Step 1: Run detection
      const detections = await this.runDetectionPipeline(images[0], options);

      // Step 2: Handle detection results
      if (!detections || detections.length === 0) {
        return this.handleNoDetection(assessmentId, images, options, Date.now() - startTime);
      }

      // Step 3: Analyze and build assessment
      const assessment = await this.buildAssessment(
        assessmentId,
        detections,
        options,
        Date.now() - startTime
      );

      // Step 4: Save if requested
      if (options.saveAssessment) {
        await this.saveAssessment(assessment, images, options);
      }

      return assessment;

    } catch (error) {
      logger.error('Assessment failed:', error);

      // Fallback to GPT-4 if available
      if (options.useGPTFallback) {
        return this.assessWithGPTFallback(assessmentId, images, options, Date.now() - startTime);
      }

      throw error;
    }
  }

  /**
   * Run detection pipeline (YOLO + optional SAM3)
   */
  private static async runDetectionPipeline(
    imageUrl: string,
    options: AssessmentOptions
  ): Promise<EnhancedMaintenanceDetection[]> {
    try {
      const detections = await MaintenanceDetectionService.detectMaintenanceIssues(
        imageUrl,
        {
          useSAM3: options.useSAM3 ?? true, // Use SAM3 by default
          confidenceThreshold: 0.5
        }
      );

      return detections;
    } catch (error) {
      logger.error('Detection pipeline failed:', error);
      return [];
    }
  }

  /**
   * Build complete assessment from detections
   */
  private static async buildAssessment(
    assessmentId: string,
    detections: EnhancedMaintenanceDetection[],
    options: AssessmentOptions,
    processingTime: number
  ): Promise<MaintenanceAssessment> {
    // Get primary detection (highest confidence)
    const primary = detections[0];
    const confidence = primary.confidence;
    const confidenceLevel = this.getConfidenceLevel(confidence);

    // Get knowledge base information
    const knowledge = await MaintenanceKnowledgeBase.getKnowledge(primary.issue_type);

    // Calculate severity
    const severity = primary.affected_area_percentage
      ? MaintenanceDetectionService.calculateSeverityFromSegmentation(primary)
      : primary.severity;

    // Determine urgency based on issue type and severity
    const urgency = this.determineUrgency(primary, severity);

    // Build assessment
    const assessment: MaintenanceAssessment = {
      id: assessmentId,
      timestamp: new Date().toISOString(),

      // Issue detection
      issue_detected: primary.issue_type,
      issue_category: primary.category,
      confidence: Math.round(confidence * 100),
      confidence_level: confidenceLevel,
      severity,

      // Enhanced details
      affected_area_percentage: primary.affected_area_percentage,
      precise_location: this.describeBoundaries(primary.boundaries),
      damage_boundaries: primary.boundaries,
      multiple_issues: detections.length > 1
        ? detections.slice(1).map(d => d.issue_type)
        : undefined,

      // Contractor routing
      contractor_type: primary.contractor_type,
      urgency,
      estimated_duration: primary.estimated_time,

      // Knowledge base data
      materials_needed: knowledge?.common_materials || [],
      tools_required: knowledge?.common_tools || [],
      specialized_equipment: knowledge?.specialized_equipment,
      cost_range: knowledge ? {
        min: knowledge.cost_estimate_min,
        max: knowledge.cost_estimate_max,
        currency: 'USD'
      } : null,
      safety_notes: knowledge?.safety_precautions || [],
      immediate_actions: knowledge?.homeowner_immediate_actions || [],
      homeowner_tips: knowledge?.homeowner_tips || [],
      diy_possibility: knowledge?.diy_difficulty || null,
      diy_instructions: knowledge?.diy_instructions,

      // Metadata
      processing_time_ms: processingTime,
      model_version: 'maintenance-yolo-v1',
      model_type: 'maintenance_yolo',
      segmentation_enabled: !!primary.precise_mask,

      // Status
      status: confidenceLevel === 'high' ? 'identified' : 'need_more_info',
      message: this.generateMessage(primary, confidenceLevel, severity),

      // Additional guidance for lower confidence
      ...(confidenceLevel === 'low' && {
        request_new_photo: true,
        photo_guidance: this.getPhotoGuidance(primary.issue_type)
      }),

      ...(confidenceLevel === 'medium' && {
        alternative_issues: detections.slice(1, 3).map(d => d.issue_type)
      })
    };

    return assessment;
  }

  /**
   * Handle case when no issues detected
   */
  private static async handleNoDetection(
    assessmentId: string,
    images: string[],
    options: AssessmentOptions,
    processingTime: number
  ): Promise<MaintenanceAssessment> {
    if (options.userDescription) {
      // Use description to guide assessment
      return await this.assessWithDescription(assessmentId, images, options, processingTime);
    }

    return {
      id: assessmentId,
      timestamp: new Date().toISOString(),
      issue_detected: null,
      issue_category: null,
      confidence: 0,
      confidence_level: 'low',
      severity: null,
      contractor_type: null,
      urgency: 'monitor',
      estimated_duration: null,
      materials_needed: [],
      tools_required: [],
      safety_notes: [],
      immediate_actions: [],
      homeowner_tips: [],
      cost_range: null,
      diy_possibility: null,
      processing_time_ms: processingTime,
      model_version: 'maintenance-yolo-v1',
      model_type: 'maintenance_yolo',
      segmentation_enabled: false,
      status: 'no_issue_detected',
      message: 'No maintenance issues detected in the image',
      request_description: true,
      photo_guidance: [
        'Take a closer photo of the problem area',
        'Ensure good lighting',
        'Include the entire affected area in frame',
        'Avoid glare or shadows'
      ]
    };
  }

  /**
   * Use user description to guide assessment
   */
  private static async assessWithDescription(
    assessmentId: string,
    images: string[],
    options: AssessmentOptions,
    processingTime: number
  ): Promise<MaintenanceAssessment> {
    // Extract likely issue type from description
    const likelyIssue = await this.extractIssueFromDescription(options.userDescription!);

    if (likelyIssue) {
      const knowledge = await MaintenanceKnowledgeBase.getKnowledge(likelyIssue);

      return {
        id: assessmentId,
        timestamp: new Date().toISOString(),
        issue_detected: likelyIssue,
        issue_category: knowledge?.issue_category || 'other',
        confidence: 60, // Lower confidence since based on description
        confidence_level: 'medium',
        severity: 'moderate', // Default severity
        contractor_type: knowledge?.primary_contractor || null,
        urgency: 'soon',
        estimated_duration: knowledge?.time_estimate || null,
        materials_needed: knowledge?.common_materials || [],
        tools_required: knowledge?.common_tools || [],
        safety_notes: knowledge?.safety_precautions || [],
        immediate_actions: knowledge?.homeowner_immediate_actions || [],
        homeowner_tips: knowledge?.homeowner_tips || [],
        cost_range: knowledge ? {
          min: knowledge.cost_estimate_min,
          max: knowledge.cost_estimate_max,
          currency: 'USD'
        } : null,
        diy_possibility: knowledge?.diy_difficulty || null,
        processing_time_ms: processingTime,
        model_version: 'description-based',
        model_type: 'maintenance_yolo',
        segmentation_enabled: false,
        status: 'identified',
        message: `Based on your description, this appears to be: ${likelyIssue.replace('_', ' ')}`,
        request_new_photo: true,
        photo_guidance: this.getPhotoGuidance(likelyIssue)
      };
    }

    // Fallback to GPT-4 if available
    if (options.useGPTFallback) {
      return this.assessWithGPTFallback(assessmentId, images, options, processingTime);
    }

    return this.handleNoDetection(assessmentId, images, { ...options, userDescription: undefined }, processingTime);
  }

  /**
   * GPT-4 Vision fallback for complex cases
   */
  private static async assessWithGPTFallback(
    assessmentId: string,
    images: string[],
    options: AssessmentOptions,
    processingTime: number
  ): Promise<MaintenanceAssessment> {
    try {
      const prompt = `
        Analyze this maintenance issue image.
        ${options.userDescription ? `User description: ${options.userDescription}` : ''}

        Identify:
        1. Type of issue (plumbing/electrical/structural/HVAC/appliance)
        2. Specific problem
        3. Severity (minor/moderate/major/critical)
        4. Urgency (immediate/urgent/soon/planned/monitor)
        5. Contractor type needed
        6. Estimated repair time
        7. Key materials needed
        8. Safety concerns
        9. Immediate actions homeowner should take

        Return as JSON with keys: issue_type, category, severity, urgency, contractor_type,
        time_estimate, materials, tools, safety_notes, immediate_actions, confidence
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: images[0] } }
          ]
        }],
        max_tokens: 500
      });

      const gptResult = JSON.parse(response.choices[0].message.content || '{}');

      return {
        id: assessmentId,
        timestamp: new Date().toISOString(),
        issue_detected: gptResult.issue_type,
        issue_category: gptResult.category,
        confidence: gptResult.confidence || 75,
        confidence_level: gptResult.confidence >= 80 ? 'high' : gptResult.confidence >= 60 ? 'medium' : 'low',
        severity: gptResult.severity,
        contractor_type: gptResult.contractor_type,
        urgency: gptResult.urgency,
        estimated_duration: gptResult.time_estimate,
        materials_needed: gptResult.materials || [],
        tools_required: gptResult.tools || [],
        safety_notes: gptResult.safety_notes || [],
        immediate_actions: gptResult.immediate_actions || [],
        homeowner_tips: [],
        cost_range: null,
        diy_possibility: null,
        processing_time_ms: processingTime,
        model_version: 'gpt-4-vision',
        model_type: 'gpt4_fallback',
        segmentation_enabled: false,
        status: 'identified',
        message: `Issue identified: ${gptResult.issue_type}`
      };

    } catch (error) {
      logger.error('GPT-4 fallback failed:', error);
      return this.handleNoDetection(assessmentId, images, options, processingTime);
    }
  }

  /**
   * Save assessment to database
   */
  private static async saveAssessment(
    assessment: MaintenanceAssessment,
    images: string[],
    options: AssessmentOptions
  ): Promise<void> {
    try {
      const supabase = await serverSupabase();
      await supabase.from('maintenance_assessments').insert({
        id: assessment.id,
        user_id: options.userId,
        job_id: options.jobId,
        issue_type: assessment.issue_detected,
        severity: assessment.severity,
        confidence: assessment.confidence,
        urgency: assessment.urgency,
        issue_category: assessment.issue_category,
        contractor_type: assessment.contractor_type,
        estimated_duration: assessment.estimated_duration,
        materials_needed: assessment.materials_needed,
        tools_required: assessment.tools_required,
        homeowner_tips: assessment.homeowner_tips,
        cost_estimate_range: assessment.cost_range,
        assessment_data: assessment,
        segmentation_masks: assessment.damage_boundaries,
        affected_area_percentage: assessment.affected_area_percentage,
        model_version: assessment.model_version,
        model_type: assessment.model_type
      });

      logger.info(`Assessment saved: ${assessment.id}`);
    } catch (error) {
      logger.error('Failed to save assessment:', error);
    }
  }

  // Helper methods

  private static getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.60) return 'medium';
    return 'low';
  }

  private static determineUrgency(
    detection: EnhancedMaintenanceDetection,
    severity: string
  ): 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor' {
    if (detection.requires_immediate_attention) return 'immediate';
    if (severity === 'critical') return 'urgent';
    if (severity === 'major') return 'soon';
    if (severity === 'moderate') return 'planned';
    return 'monitor';
  }

  private static describeBoundaries(
    boundaries?: { top: number; bottom: number; left: number; right: number }
  ): string | undefined {
    if (!boundaries) return undefined;

    const verticalPosition = boundaries.top < 100 ? 'upper' : boundaries.bottom > 400 ? 'lower' : 'middle';
    const horizontalPosition = boundaries.left < 100 ? 'left' : boundaries.right > 400 ? 'right' : 'center';

    return `${verticalPosition} ${horizontalPosition} area`;
  }

  private static generateMessage(
    detection: EnhancedMaintenanceDetection,
    confidenceLevel: string,
    severity: string
  ): string {
    const issueText = detection.issue_type.replace('_', ' ');

    if (confidenceLevel === 'high') {
      return `${severity.charAt(0).toUpperCase() + severity.slice(1)} ${issueText} detected. ${detection.contractor_type} recommended.`;
    } else if (confidenceLevel === 'medium') {
      return `Possible ${issueText} detected. Please verify and provide additional details if needed.`;
    } else {
      return `Potential issue detected but confidence is low. Please provide a clearer photo or description.`;
    }
  }

  private static getPhotoGuidance(issueType: string): string[] {
    const guidance: Record<string, string[]> = {
      'pipe_leak': [
        'Capture the source of the leak clearly',
        'Show the surrounding pipe connections',
        'Include any water damage or staining'
      ],
      'wall_crack': [
        'Capture the entire length of the crack',
        'Use good lighting to show depth',
        'Include a coin or ruler for scale'
      ],
      'outlet_damage': [
        'Turn off power first for safety',
        'Show any burn marks or damage clearly',
        'Capture the full outlet and surrounding wall'
      ],
      'default': [
        'Take photo from 2-3 feet away',
        'Ensure good, even lighting',
        'Capture the entire problem area',
        'Avoid shadows and glare'
      ]
    };

    return guidance[issueType] || guidance.default;
  }

  private static async extractIssueFromDescription(description: string): Promise<string | null> {
    const keywords: Record<string, string[]> = {
      'pipe_leak': ['leak', 'drip', 'water', 'pipe'],
      'faucet_drip': ['faucet', 'tap', 'dripping'],
      'toilet_issue': ['toilet', 'flush', 'running'],
      'outlet_damage': ['outlet', 'socket', 'electrical', 'sparks'],
      'wall_crack': ['crack', 'wall', 'split'],
      'ceiling_stain': ['ceiling', 'stain', 'water damage'],
      'ac_not_cooling': ['ac', 'air conditioning', 'cooling', 'hot'],
      'heating_issue': ['heat', 'heater', 'cold', 'furnace']
    };

    const lowerDesc = description.toLowerCase();

    for (const [issue, words] of Object.entries(keywords)) {
      if (words.some(word => lowerDesc.includes(word))) {
        return issue;
      }
    }

    return null;
  }
}