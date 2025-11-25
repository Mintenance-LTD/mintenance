/**
 * Shadow Mode Batch Execution Script
 * 
 * Processes a CSV of ground truth labels and runs the AI agent in shadow mode.
 * Stores predictions in building_assessments for training.
 * Processes images in batches (default: 50) and generates progress reports.
 * 
 * Usage: npx tsx scripts/run-shadow-mode-batch.ts <csv-file-path> [batch-size] [delay-ms] [max-retries]
 * 
 * Arguments:
 *   csv-file-path: Path to CSV file with ground truth labels
 *   batch-size: Number of images to process before generating progress report (default: 50)
 *   delay-ms: Delay between requests in milliseconds (default: 2000)
 *   max-retries: Maximum retry attempts for rate limit errors (default: 5)
 * 
 * CSV Format:
 * filename,image_url,true_class,critical_hazard,property_type,property_age,region
 * img_001.jpg,https://...,Structural Crack,true,residential,25,London
 * 
 * Example:
 *   npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 50 3000 5
 */

// Load environment variables FIRST (before any other imports)
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import type { AssessmentContext } from '../apps/web/lib/services/building-surveyor/types';

// Dynamic import for BuildingSurveyorService (after env vars are loaded)
let BuildingSurveyorService: typeof import('../apps/web/lib/services/building-surveyor/BuildingSurveyorService').BuildingSurveyorService;

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface GroundTruthRow {
  filename: string;
  image_url: string;
  true_class: string;
  critical_hazard: boolean;
  property_type?: string;
  property_age?: number;
  region?: string;
}

interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ filename: string; error: string }>;
}

interface ProgressReport {
  batchNumber: number;
  totalBatches: number;
  batchStartIndex: number;
  batchEndIndex: number;
  batchSize: number;
  processed: number;
  successful: number;
  failed: number;
  elapsedMs: number;
  averageTimePerImage: number;
  estimatedTimeRemaining: number;
  successRate: string;
  timestamp: string;
}

/**
 * Parse CSV file into array of objects
 */
function parseCSV(filePath: string): GroundTruthRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: GroundTruthRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      logger.warn(`Skipping row ${i + 1}: column count mismatch`, {
        expected: headers.length,
        actual: values.length,
      });
      continue;
    }

    const row: Partial<GroundTruthRow> = {};
    headers.forEach((header, index) => {
      const value = values[index];
      if (header === 'critical_hazard') {
        row[header] = value.toLowerCase() === 'true' || value === '1';
      } else if (header === 'property_age') {
        row[header] = value ? Number.parseInt(value, 10) : undefined;
      } else if (header === 'property_type') {
        // Validate property_type is one of the allowed values
        const validTypes = ['residential', 'commercial', 'industrial'] as const;
        row[header] = (value && validTypes.includes(value as typeof validTypes[number])) 
          ? (value as typeof validTypes[number])
          : undefined;
      } else {
        // Type assertion for string fields
        const key = header as keyof GroundTruthRow;
        if (key === 'filename' || key === 'image_url' || key === 'true_class' || key === 'region') {
          row[key] = value || undefined;
        }
      }
    });

    // Validate required fields
    if (!row.filename || !row.image_url || !row.true_class) {
      logger.warn(`Skipping row ${i + 1}: missing required fields`, { row });
      continue;
    }

    rows.push(row as GroundTruthRow);
  }

  return rows;
}

/**
 * Run shadow mode assessment for a single image with retry logic
 */
async function runShadowModeAssessment(
  row: GroundTruthRow,
  index: number,
  total: number,
  maxRetries: number = 5
): Promise<{ success: boolean; error?: string }> {
  const baseDelayMs = 2000; // Start with 2 seconds
  const maxDelayMs = 60000; // Max 60 seconds

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`Processing ${index + 1}/${total}: ${row.filename} (retry attempt ${attempt + 1}/${maxRetries + 1})`);
      } else {
        logger.info(`Processing ${index + 1}/${total}: ${row.filename}`);
      }

      // Lazy load BuildingSurveyorService (after env vars are set)
      if (!BuildingSurveyorService) {
        const module = await import('../apps/web/lib/services/building-surveyor/BuildingSurveyorService');
        BuildingSurveyorService = module.BuildingSurveyorService;
      }

      // Set shadow mode environment variable
      process.env.SHADOW_MODE_ENABLED = 'true';
      process.env.ENABLE_SAM3_SEGMENTATION = 'true';

      // Build assessment context
      const context: AssessmentContext = {
        propertyType: row.property_type as 'residential' | 'commercial' | 'industrial' | undefined,
        ageOfProperty: row.property_age,
        location: row.region,
        shadowMode: true,
      };

      // Run assessment
      const assessment = await BuildingSurveyorService.assessDamage(
        [row.image_url],
        context
      );

      // Extract prediction data
      const fusionMean = assessment.decisionResult?.fusionMean || 0;
      const fusionVariance = assessment.decisionResult?.fusionVariance || 0;
      // Context features are not stored in decisionResult, extract from assessment_data if needed
      const contextFeatures = null; // Will be extracted from assessment_data JSONB if needed
      const sam3Evidence = assessment.evidence?.sam3Segmentation || null;
      const gpt4Assessment = {
        severity: assessment.damageAssessment.severity,
        confidence: assessment.damageAssessment.confidence,
        damageType: assessment.damageAssessment.damageType,
        hasCriticalHazards: assessment.safetyHazards.hasCriticalHazards,
      };
      const sceneGraphFeatures = assessment.evidence?.sceneGraphFeatures || null;

      // Generate cache key (SHA256 hash to fit within 64 chars)
      const cacheKey = createHash('sha256')
        .update(`shadow_${row.filename}`)
        .digest('hex');

      // Round decimal values to integers for INTEGER columns
      const roundToInt = (value: number | undefined): number => {
        if (value === undefined || value === null) return 0;
        return Math.round(Math.max(0, Math.min(100, value))); // Clamp to 0-100 range
      };

      // Truncate damage_type to fit VARCHAR(100) constraint
      const truncateDamageType = (damageType: string): string => {
        if (damageType.length > 100) {
          logger.warn(`Truncating damage_type from ${damageType.length} to 100 characters`, {
            original: damageType,
            truncated: damageType.substring(0, 100),
          });
          return damageType.substring(0, 100);
        }
        return damageType;
      };

      const now = new Date().toISOString();

      // Store in building_assessments
      const { error: insertError } = await serverSupabase
        .from('building_assessments')
        .insert({
          user_id: null, // Shadow mode doesn't have a user
          cache_key: cacheKey,
          damage_type: truncateDamageType(assessment.damageAssessment.damageType),
          severity: assessment.damageAssessment.severity,
          confidence: roundToInt(assessment.damageAssessment.confidence),
          safety_score: roundToInt(assessment.safetyHazards.overallSafetyScore),
          compliance_score: roundToInt(assessment.compliance.complianceScore),
          insurance_risk_score: roundToInt(assessment.insuranceRisk.riskScore),
          urgency: assessment.urgency.urgency,
          assessment_data: assessment as any,
          validation_status: 'pending',
          shadow_mode: true,
          predicted_class: truncateDamageType(assessment.damageAssessment.damageType),
          predicted_severity: assessment.damageAssessment.severity,
          raw_probability: fusionMean,
          fusion_variance: fusionVariance,
          context_features: contextFeatures,
          sam3_evidence: sam3Evidence,
          gpt4_assessment: gpt4Assessment,
          scene_graph_features: sceneGraphFeatures,
          true_class: row.true_class ? truncateDamageType(row.true_class) : null,
          critical_hazard: row.critical_hazard,
          auto_validated: false, // Shadow mode assessments are not auto-validated
          auto_validation_review_status: 'not_applicable', // Not applicable for shadow mode
          created_at: now,
          updated_at: now,
        });

      if (insertError) {
        throw new Error(`Failed to insert assessment: ${insertError.message}`);
      }

      logger.info(`✓ Successfully processed ${row.filename}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('too many requests');
      
      // If it's a rate limit error and we have retries left, wait and retry
      if (isRateLimitError && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s, max 60s
        const delayMs = Math.min(
          baseDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );
        
        logger.warn(
          `Rate limit hit for ${row.filename}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
          { error: errorMessage }
        );
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue; // Retry the request
      }
      
      // If it's not a rate limit error, or we're out of retries, fail
      logger.error(`Failed to process ${row.filename}`, { 
        error: errorMessage,
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1
      });
      return { success: false, error: errorMessage };
    }
  }
  
  // This should never be reached, but TypeScript requires it
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Generate and display progress report
 */
function generateProgressReport(
  batchNumber: number,
  totalBatches: number,
  batchStartIndex: number,
  batchEndIndex: number,
  batchSize: number,
  batchStartTime: number,
  overallResult: BatchResult
): ProgressReport {
  const now = Date.now();
  const elapsedMs = now - batchStartTime;
  const processed = overallResult.successful + overallResult.failed;
  const averageTimePerImage = processed > 0 ? elapsedMs / processed : 0;
  const remaining = overallResult.total - processed;
  const estimatedTimeRemaining = Math.round((averageTimePerImage * remaining) / 1000); // in seconds

  const report: ProgressReport = {
    batchNumber,
    totalBatches,
    batchStartIndex,
    batchEndIndex,
    batchSize,
    processed,
    successful: overallResult.successful,
    failed: overallResult.failed,
    elapsedMs,
    averageTimePerImage,
    estimatedTimeRemaining,
    successRate: `${((overallResult.successful / processed) * 100).toFixed(2)}%`,
    timestamp: new Date().toISOString(),
  };

  // Display progress report
  console.log('\n' + '='.repeat(80));
  console.log(`📊 BATCH ${batchNumber}/${totalBatches} COMPLETE`);
  console.log('='.repeat(80));
  console.log(`   Batch Range:      ${batchStartIndex + 1} - ${batchEndIndex + 1} (${batchSize} images)`);
  console.log(`   Overall Progress: ${processed}/${overallResult.total} (${((processed / overallResult.total) * 100).toFixed(1)}%)`);
  console.log(`   Successful:       ${overallResult.successful}`);
  console.log(`   Failed:           ${overallResult.failed}`);
  console.log(`   Success Rate:     ${report.successRate}`);
  console.log(`   Elapsed Time:     ${formatTime(elapsedMs)}`);
  console.log(`   Avg Time/Image:   ${(averageTimePerImage / 1000).toFixed(2)}s`);
  console.log(`   Est. Remaining:   ${formatTime(estimatedTimeRemaining * 1000)}`);
  console.log('='.repeat(80) + '\n');

  return report;
}

/**
 * Format milliseconds to human-readable time
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Main execution function
 */
async function main() {
  const csvPath = process.argv[2];
  const batchSize = parseInt(process.argv[3] || '50', 10); // Default 50 images per batch
  const delayMs = parseInt(process.argv[4] || '2000', 10); // Default 2 seconds
  const maxRetries = parseInt(process.argv[5] || '5', 10); // Default 5 retries

  if (!csvPath) {
    console.error('❌ Missing CSV file path');
    console.error('   Usage: npx tsx scripts/run-shadow-mode-batch.ts <csv-file-path> [batch-size] [delay-ms] [max-retries]');
    console.error('   Example: npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 50 3000 5');
    process.exit(1);
  }

  const startTime = Date.now();
  const progressReports: ProgressReport[] = [];

  try {
    console.log('\n🚀 Starting Shadow Mode Batch Execution');
    console.log('='.repeat(80));
    logger.info('Starting shadow mode batch execution', { 
      csvPath, 
      batchSize,
      delayMs, 
      maxRetries,
      note: 'Using retry logic with exponential backoff for rate limit errors'
    });

    // Parse CSV
    const rows = parseCSV(csvPath);
    logger.info(`Parsed ${rows.length} rows from CSV`);

    if (rows.length === 0) {
      console.error('❌ No valid rows found in CSV');
      process.exit(1);
    }

    const totalBatches = Math.ceil(rows.length / batchSize);
    console.log(`📋 Total Images: ${rows.length}`);
    console.log(`📦 Batch Size: ${batchSize} images per batch`);
    console.log(`🔄 Total Batches: ${totalBatches}`);
    console.log(`⏱️  Delay Between Requests: ${delayMs}ms`);
    console.log('='.repeat(80) + '\n');

    // Process each row
    const result: BatchResult = {
      total: rows.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStartIndex = batchNum * batchSize;
      const batchEndIndex = Math.min(batchStartIndex + batchSize, rows.length);
      const batchStartTime = Date.now();

      console.log(`\n🔄 Processing Batch ${batchNum + 1}/${totalBatches} (images ${batchStartIndex + 1}-${batchEndIndex})...\n`);

      // Process each image in this batch
      for (let i = batchStartIndex; i < batchEndIndex; i++) {
        const rowResult = await runShadowModeAssessment(rows[i], i, rows.length, maxRetries);
        
        if (rowResult.success) {
          result.successful++;
        } else {
          result.failed++;
          result.errors.push({
            filename: rows[i].filename,
            error: rowResult.error || 'Unknown error',
          });
        }

        // Add configurable delay between requests (default 2 seconds)
        if (i < rows.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Generate progress report after each batch
      const report = generateProgressReport(
        batchNum + 1,
        totalBatches,
        batchStartIndex,
        batchEndIndex - 1,
        batchEndIndex - batchStartIndex,
        batchStartTime,
        result
      );
      progressReports.push(report);

      // Save intermediate progress report
      const progressReportPath = `training-data/shadow-mode-batch-progress-${Date.now()}.json`;
      writeFileSync(
        progressReportPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          csvPath,
          batchNumber: batchNum + 1,
          totalBatches,
          overallProgress: result,
          currentBatchReport: report,
          allReports: progressReports,
        }, null, 2)
      );
    }

    // Generate final summary report
    const totalElapsedMs = Date.now() - startTime;
    const summary = {
      timestamp: new Date().toISOString(),
      csvPath,
      batchSize,
      delayMs,
      maxRetries,
      ...result,
      successRate: `${((result.successful / result.total) * 100).toFixed(2)}%`,
      totalElapsedMs,
      totalElapsedTime: formatTime(totalElapsedMs),
      averageTimePerImage: totalElapsedMs / result.total,
      progressReports,
    };

    logger.info('Shadow mode batch execution completed', summary);

    // Write final summary to file
    const summaryPath = `training-data/shadow-mode-batch-${Date.now()}.json`;
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Display final results
    console.log('\n' + '='.repeat(80));
    console.log('✅ SHADOW MODE BATCH EXECUTION COMPLETE');
    console.log('='.repeat(80));
    console.log(`   Total Processed:    ${result.total}`);
    console.log(`   Successful:         ${result.successful}`);
    console.log(`   Failed:             ${result.failed}`);
    console.log(`   Success Rate:       ${summary.successRate}`);
    console.log(`   Total Time:         ${summary.totalElapsedTime}`);
    console.log(`   Avg Time/Image:     ${(summary.averageTimePerImage / 1000).toFixed(2)}s`);
    console.log(`\n   Final Summary:      ${summaryPath}`);
    console.log('='.repeat(80));

    if (result.errors.length > 0) {
      console.log(`\n❌ Failed Images (${result.errors.length}):`);
      result.errors.slice(0, 10).forEach(({ filename, error }) => {
        console.log(`   - ${filename}: ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors (see summary file for details)`);
      }
    }

    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    logger.error('Shadow mode batch execution failed', { error });
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

