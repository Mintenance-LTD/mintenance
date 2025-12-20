/**
 * Bootstrap Training Data for Maintenance AI
 * Uses SAM3 + GPT-4 to generate initial training labels
 */

import { createClient } from '@supabase/supabase-js';
import { SAM3Service } from '@/apps/web/lib/services/building-surveyor/SAM3Service';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Maintenance categories for training
const MAINTENANCE_CATEGORIES = [
  'pipe_leak', 'faucet_drip', 'toilet_issue', 'water_heater', 'drain_blocked',
  'outlet_damage', 'light_fixture', 'circuit_breaker',
  'wall_crack', 'ceiling_stain', 'window_broken', 'door_issue',
  'ac_not_cooling', 'heating_issue', 'vent_blocked'
];

interface TrainingDataPoint {
  image_url: string;
  job_id?: string;
  description?: string;
  segments: any[];
  classification: MaintenanceClassification;
  yolo_labels: string;
  source: 'historical' | 'contractor' | 'synthetic' | 'bootstrap';
}

interface MaintenanceClassification {
  primary_issue: string;
  confidence: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  regions: Array<{
    index: number;
    issue_type: string;
    confidence: number;
  }>;
}

class MaintenanceTrainingBootstrap {
  private processedCount = 0;
  private errorCount = 0;
  private startTime = Date.now();

  /**
   * Main bootstrap process
   */
  async bootstrap(limit = 1000): Promise<void> {
    console.log(`Starting bootstrap process for ${limit} images...`);

    try {
      // Step 1: Get historical job images
      const historicalData = await this.getHistoricalJobImages(limit);
      console.log(`Found ${historicalData.length} historical images`);

      // Step 2: Process each image
      for (const data of historicalData) {
        await this.processImage(data);

        // Rate limiting for GPT-4
        if (this.processedCount % 10 === 0) {
          console.log(`Processed ${this.processedCount}/${limit} images`);
          await this.sleep(2000); // 2 second delay every 10 images
        }
      }

      // Step 3: Generate summary
      await this.generateSummary();

    } catch (error) {
      console.error('Bootstrap failed:', error);
      throw error;
    }
  }

  /**
   * Get historical job images from database
   */
  private async getHistoricalJobImages(limit: number): Promise<any[]> {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, description, images, status')
      .not('images', 'is', null)
      .in('status', ['completed', 'in_progress'])
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    // Flatten to individual images
    const imageData: any[] = [];
    for (const job of jobs || []) {
      if (job.images && Array.isArray(job.images)) {
        for (const imageUrl of job.images) {
          imageData.push({
            job_id: job.id,
            title: job.title,
            description: job.description,
            image_url: imageUrl
          });
        }
      }
    }

    return imageData;
  }

  /**
   * Process a single image
   */
  private async processImage(data: any): Promise<void> {
    try {
      // Step 1: Run SAM3 segmentation
      const segments = await this.runSAM3Segmentation(data.image_url);

      if (!segments || segments.length === 0) {
        console.log(`No segments found for image: ${data.image_url}`);
        return;
      }

      // Step 2: Classify with GPT-4 (only during bootstrap!)
      const classification = await this.classifyWithGPT4(
        data.image_url,
        segments,
        data.description || data.title
      );

      // Step 3: Generate YOLO labels
      const yoloLabels = this.generateYOLOLabels(segments, classification);

      // Step 4: Save training data
      await this.saveTrainingData({
        image_url: data.image_url,
        job_id: data.job_id,
        description: data.description,
        segments,
        classification,
        yolo_labels: yoloLabels,
        source: 'bootstrap'
      });

      this.processedCount++;

    } catch (error) {
      console.error(`Failed to process image ${data.image_url}:`, error);
      this.errorCount++;
    }
  }

  /**
   * Run SAM3 segmentation
   */
  private async runSAM3Segmentation(imageUrl: string): Promise<any[]> {
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
        throw new Error(`SAM3 failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.damage_areas || [];

    } catch (error) {
      console.error('SAM3 segmentation failed:', error);
      // Return empty array to continue with other images
      return [];
    }
  }

  /**
   * Classify segments using GPT-4 Vision
   */
  private async classifyWithGPT4(
    imageUrl: string,
    segments: any[],
    description: string
  ): Promise<MaintenanceClassification> {

    // Create segment descriptions
    const segmentDescriptions = segments.map((seg, i) =>
      `Region ${i}: ${seg.area} pixels at bbox(${seg.bbox.join(',')}), confidence: ${seg.score}`
    ).join('\n');

    const prompt = `
      Analyze this maintenance issue image for training data generation.

      User description: ${description || 'Not provided'}

      Detected regions by segmentation:
      ${segmentDescriptions}

      Classify the image and each significant region into these maintenance categories:
      ${MAINTENANCE_CATEGORIES.join(', ')}

      For each region that shows a maintenance issue, provide:
      1. The region index (0-based)
      2. Issue type from the categories above
      3. Confidence score (0-1)

      Also provide:
      - Primary issue type for the whole image
      - Overall confidence
      - Severity: minor/moderate/major/critical

      Return as JSON with this structure:
      {
        "primary_issue": "pipe_leak",
        "confidence": 0.85,
        "severity": "moderate",
        "regions": [
          {"index": 0, "issue_type": "pipe_leak", "confidence": 0.9},
          {"index": 2, "issue_type": "water_damage", "confidence": 0.7}
        ]
      }

      Only include regions that actually show maintenance issues.
      If no clear maintenance issue is visible, set primary_issue to "unknown".
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3 // Lower temperature for more consistent labeling
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from GPT-4');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from GPT-4');
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('GPT-4 classification failed:', error);
      // Return unknown classification
      return {
        primary_issue: 'unknown',
        confidence: 0,
        severity: 'minor',
        regions: []
      };
    }
  }

  /**
   * Generate YOLO format labels
   */
  private generateYOLOLabels(
    segments: any[],
    classification: MaintenanceClassification
  ): string {
    const lines: string[] = [];

    for (const region of classification.regions) {
      const segment = segments[region.index];
      if (!segment) continue;

      // Get class ID
      const classId = MAINTENANCE_CATEGORIES.indexOf(region.issue_type);
      if (classId === -1) continue;

      // Convert bbox to YOLO format (normalized x_center, y_center, width, height)
      const bbox = segment.bbox;
      const imageWidth = 640; // Standard YOLO size
      const imageHeight = 640;

      const x_center = (bbox[0] + bbox[2] / 2) / imageWidth;
      const y_center = (bbox[1] + bbox[3] / 2) / imageHeight;
      const width = bbox[2] / imageWidth;
      const height = bbox[3] / imageHeight;

      // Ensure values are in [0, 1] range
      if (x_center >= 0 && x_center <= 1 &&
          y_center >= 0 && y_center <= 1 &&
          width > 0 && width <= 1 &&
          height > 0 && height <= 1) {
        lines.push(`${classId} ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Save training data to database
   */
  private async saveTrainingData(data: TrainingDataPoint): Promise<void> {
    const batch = [];

    // Save to maintenance_training_labels
    if (data.classification.primary_issue !== 'unknown') {
      batch.push(
        supabase.from('maintenance_training_labels').insert({
          assessment_id: crypto.randomUUID(),
          image_urls: [data.image_url],
          gpt4_response: data.classification,
          issue_type: data.classification.primary_issue,
          severity: data.classification.severity,
          confidence: data.classification.confidence * 100,
          used_in_training: false,
          response_quality: data.classification.confidence > 0.8 ? 'high' :
                           data.classification.confidence > 0.6 ? 'medium' : 'low'
        })
      );
    }

    // Save to maintenance_corrections (YOLO format)
    if (data.yolo_labels.length > 0) {
      batch.push(
        supabase.from('maintenance_corrections').insert({
          assessment_id: data.job_id || crypto.randomUUID(),
          image_url: data.image_url,
          corrected_labels: data.yolo_labels,
          correction_quality: 'bootstrap',
          status: 'approved', // Auto-approve bootstrap data
          confidence_score: data.classification.confidence,
          used_in_training: false
        })
      );
    }

    // Save SAM3 masks for each region
    for (const region of data.classification.regions) {
      const segment = data.segments[region.index];
      if (!segment) continue;

      batch.push(
        supabase.from('maintenance_segmentation_masks').insert({
          assessment_id: data.job_id || crypto.randomUUID(),
          image_url: data.image_url,
          damage_type: region.issue_type,
          masks: [segment.mask], // Store mask data
          boxes: [segment.bbox],
          scores: [region.confidence],
          num_instances: 1,
          total_affected_area: segment.area,
          average_confidence: region.confidence,
          used_in_training: false,
          segmentation_quality: segment.score > 0.9 ? 'excellent' :
                                segment.score > 0.8 ? 'good' :
                                segment.score > 0.7 ? 'fair' : 'poor'
        })
      );
    }

    // Execute all inserts
    await Promise.all(batch);
  }

  /**
   * Generate summary report
   */
  private async generateSummary(): Promise<void> {
    const duration = (Date.now() - this.startTime) / 1000;

    // Get statistics from database
    const { data: stats } = await supabase.rpc('get_training_data_status');

    console.log('\n=== Bootstrap Summary ===');
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Images processed: ${this.processedCount}`);
    console.log(`Errors: ${this.errorCount}`);
    console.log(`Success rate: ${((this.processedCount / (this.processedCount + this.errorCount)) * 100).toFixed(2)}%`);

    if (stats && stats.length > 0) {
      console.log('\n=== Training Data Status ===');
      for (const source of stats) {
        console.log(`${source.data_source}: ${source.total_samples} total, ${source.ready_for_training} ready`);
      }
    }

    // Save summary to file
    const summary = {
      timestamp: new Date().toISOString(),
      duration_seconds: duration,
      processed_count: this.processedCount,
      error_count: this.errorCount,
      success_rate: this.processedCount / (this.processedCount + this.errorCount),
      training_data_stats: stats
    };

    await fs.writeFile(
      path.join(process.cwd(), 'bootstrap-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\nSummary saved to bootstrap-summary.json');
  }

  /**
   * Helper: Sleep for milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  console.log('Maintenance AI Training Bootstrap');
  console.log('=================================');

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'SAM3_SERVICE_URL'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const limit = parseInt(args[0]) || 1000;

  console.log(`\nConfiguration:`);
  console.log(`- Image limit: ${limit}`);
  console.log(`- SAM3 URL: ${process.env.SAM3_SERVICE_URL}`);
  console.log(`- GPT-4 Vision: Enabled`);

  // Run bootstrap
  const bootstrap = new MaintenanceTrainingBootstrap();

  try {
    await bootstrap.bootstrap(limit);
    console.log('\nBootstrap completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nBootstrap failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { MaintenanceTrainingBootstrap };