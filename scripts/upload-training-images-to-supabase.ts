/**
 * Upload Training Images to Supabase Storage
 * 
 * This script:
 * 1. Reads images from the TensorFlow dataset folder
 * 2. Uploads them to Supabase Storage bucket 'training-images'
 * 3. Updates the ground truth CSV with Supabase Storage URLs
 * 
 * Usage:
 *   npx tsx scripts/upload-training-images-to-supabase.ts [--images-path path/to/images] [--csv-path path/to/ground-truth.csv] [--batch-size 50]
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { logger } from '@mintenance/shared';

interface CsvRow {
  filename: string;
  image_url: string;
  true_class: string;
  critical_hazard: string;
  property_type: string;
  property_age: string;
  region: string;
}

/**
 * Parse CSV file
 */
function parseCsv(csvPath: string): CsvRow[] {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  const header = lines[0].split(',').map(h => h.trim());
  const rows: CsvRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV parsing (account for quoted values)
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim()); // Add last part
    
    if (parts.length >= 3) {
      rows.push({
        filename: parts[0].replace(/^"|"$/g, ''),
        image_url: parts[1].replace(/^"|"$/g, ''),
        true_class: parts[2].replace(/^"|"$/g, ''),
        critical_hazard: parts[3]?.replace(/^"|"$/g, '') || '',
        property_type: parts[4]?.replace(/^"|"$/g, '') || '',
        property_age: parts[5]?.replace(/^"|"$/g, '') || '',
        region: parts[6]?.replace(/^"|"$/g, '') || '',
      });
    }
  }
  
  return rows;
}

/**
 * Write CSV file
 */
function writeCsv(csvPath: string, rows: CsvRow[]): void {
  const header = 'filename,image_url,true_class,critical_hazard,property_type,property_age,region\n';
  const csvRows = rows.map(row => {
    const values = [
      row.filename,
      row.image_url,
      row.true_class,
      row.critical_hazard,
      row.property_type,
      row.property_age,
      row.region,
    ];
    
    // Escape values that contain commas or quotes
    return values.map(v => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    }).join(',');
  }).join('\n');
  
  writeFileSync(csvPath, header + csvRows, 'utf-8');
}

/**
 * Get all image files from directory
 */
function getImageFiles(imagesPath: string): string[] {
  const files = readdirSync(imagesPath);
  return files.filter(file => {
    const ext = file.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
  });
}

/**
 * Upload images to Supabase Storage and update CSV
 */
async function uploadTrainingImages(
  imagesPath: string,
  csvPath: string,
  batchSize: number = 50
): Promise<void> {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify bucket exists
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    throw new Error(`Failed to list buckets: ${bucketError.message}`);
  }
  
  const trainingBucket = buckets.find(b => b.id === 'training-images');
  if (!trainingBucket) {
    throw new Error('training-images bucket not found. Run the migration: supabase/migrations/20251202000003_create_training_images_bucket.sql');
  }
  
  logger.info('✓ Supabase Storage bucket verified', { bucket: 'training-images' });
  
  // Parse CSV
  logger.info('📖 Reading ground truth CSV...');
  const csvRows = parseCsv(csvPath);
  logger.info(`   Found ${csvRows.length} rows in CSV`);
  
  // Get image files
  logger.info('📁 Scanning image directory...');
  const imageFiles = getImageFiles(imagesPath);
  logger.info(`   Found ${imageFiles.length} image files`);
  
  // Create filename to CSV row mapping
  const csvMap = new Map<string, CsvRow>();
  for (const row of csvRows) {
    csvMap.set(row.filename, row);
  }
  
  // Filter to only images that exist in CSV
  const imagesToUpload = imageFiles.filter(file => csvMap.has(file));
  logger.info(`   ${imagesToUpload.length} images match CSV entries`);
  
  if (imagesToUpload.length === 0) {
    throw new Error('No matching images found. Check that filenames in CSV match image filenames.');
  }
  
  // Upload images in batches
  let uploaded = 0;
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ filename: string; error: string }> = [];
  
  logger.info(`\n🚀 Starting upload (batch size: ${batchSize})...`);
  
  for (let i = 0; i < imagesToUpload.length; i += batchSize) {
    const batch = imagesToUpload.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(imagesToUpload.length / batchSize);
    
    logger.info(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} images)...`);
    
    // Process batch in parallel
    const uploadPromises = batch.map(async (filename) => {
      const csvRow = csvMap.get(filename);
      if (!csvRow) {
        skipped++;
        return;
      }
      
      // Skip if already uploaded (URL doesn't start with file:///)
      if (!csvRow.image_url.startsWith('file:///')) {
        skipped++;
        return;
      }
      
      try {
        const imagePath = join(imagesPath, filename);
        const fileBuffer = readFileSync(imagePath);
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('training-images')
          .upload(filename, fileBuffer, {
            contentType: `image/${filename.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpeg'}`,
            upsert: true, // Replace if exists
            cacheControl: '3600',
          });
        
        if (uploadError) {
          throw new Error(uploadError.message);
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('training-images')
          .getPublicUrl(filename);
        
        // Update CSV row
        csvRow.image_url = publicUrl;
        uploaded++;
        
        return { success: true, filename };
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ filename, error: errorMessage });
        logger.warn(`   ✗ Failed to upload ${filename}: ${errorMessage}`);
        return { success: false, filename, error: errorMessage };
      }
    });
    
    await Promise.all(uploadPromises);
    
    // Show progress
    const progress = ((i + batch.length) / imagesToUpload.length * 100).toFixed(1);
    logger.info(`   Progress: ${progress}% (${uploaded} uploaded, ${failed} failed, ${skipped} skipped)`);
    
    // Save CSV after each batch (in case of interruption)
    writeCsv(csvPath, csvRows);
  }
  
  // Final save
  writeCsv(csvPath, csvRows);
  
  // Summary
  logger.info('\n✅ Upload Complete!');
  logger.info(`   Uploaded: ${uploaded}`);
  logger.info(`   Failed: ${failed}`);
  logger.info(`   Skipped: ${skipped} (already uploaded or not in CSV)`);
  
  if (errors.length > 0) {
    logger.warn(`\n⚠️  ${errors.length} errors occurred:`);
    errors.slice(0, 10).forEach(({ filename, error }) => {
      logger.warn(`   ${filename}: ${error}`);
    });
    if (errors.length > 10) {
      logger.warn(`   ... and ${errors.length - 10} more errors`);
    }
  }
  
  logger.info(`\n✓ CSV updated: ${csvPath}`);
  logger.info(`   Next step: Run shadow mode batch`);
  logger.info(`   npx tsx scripts/run-shadow-mode-batch.ts ${csvPath}`);
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let imagesPath = 'C:\\Users\\Djodjo.Nkouka.ERICCOLE\\Downloads\\Building Defect Detection 7.v2i.tensorflow\\train\\images';
  let csvPath = 'training-data/ground-truth-labels.csv';
  let batchSize = 50;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--images-path' && i + 1 < args.length) {
      imagesPath = args[i + 1];
      i++;
    } else if (args[i] === '--csv-path' && i + 1 < args.length) {
      csvPath = args[i + 1];
      i++;
    } else if (args[i] === '--batch-size' && i + 1 < args.length) {
      batchSize = Number.parseInt(args[i + 1], 10) || 50;
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: npx tsx scripts/upload-training-images-to-supabase.ts [options]

Options:
  --images-path <path>    Path to images directory (default: TensorFlow train/images folder)
  --csv-path <path>       Path to ground truth CSV (default: training-data/ground-truth-labels.csv)
  --batch-size <number>   Number of images to upload per batch (default: 50)
  --help, -h              Show this help message

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL        Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY       Your Supabase service role key

Example:
  npx tsx scripts/upload-training-images-to-supabase.ts \\
    --images-path "C:\\path\\to\\images" \\
    --csv-path training-data/ground-truth-labels.csv \\
    --batch-size 50
      `);
      process.exit(0);
    }
  }
  
  // Validate paths
  try {
    statSync(imagesPath);
  } catch (error) {
    console.error(`❌ Images path not found: ${imagesPath}`);
    process.exit(1);
  }
  
  try {
    statSync(csvPath);
  } catch (error) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }
  
  // Run upload
  uploadTrainingImages(imagesPath, csvPath, batchSize)
    .then(() => {
      logger.info('\n✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Upload failed:', error);
      if (error instanceof Error) {
        logger.error('   Error:', error.message);
      }
      process.exit(1);
    });
}

// Run if executed directly
if (require.main === module) {
  main();
}

