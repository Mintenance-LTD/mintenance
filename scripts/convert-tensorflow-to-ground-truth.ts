/**
 * Convert TensorFlow Annotations to Ground Truth CSV
 * 
 * Converts Roboflow TensorFlow Object Detection annotations CSV to
 * the ground truth CSV format required for training the BuildingSurveyorService.
 * 
 * Usage: 
 *   npx tsx scripts/convert-tensorflow-to-ground-truth.ts [--annotations-path path/to/_annotations.csv] [--output-path path/to/output.csv] [--base-image-url https://your-storage.com/images]
 * 
 * If base-image-url is not provided, will use file:/// placeholder URLs that you'll need to update.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

interface AnnotationRow {
  filename: string;
  width: number;
  height: number;
  class: string;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

interface GroundTruthRow {
  filename: string;
  image_url: string;
  true_class: string;
  critical_hazard: boolean;
  property_type?: string;
  property_age?: number;
  region?: string;
}

/**
 * Map TensorFlow classes to normalized class names for BuildingSurveyorService
 */
const classMapping: Record<string, string> = {
  // Structural issues (critical)
  'Trou': 'Structural Crack',
  'crack': 'Structural Crack',
  'wall_crack': 'Structural Crack',
  'Foundation Crack': 'Foundation Crack',
  
  // Water damage
  'leak': 'Water Damage',
  'Water Damage': 'Water Damage',
  
  // Mold
  'wall_mold': 'Mold',
  'Mold': 'Mold',
  
  // Corrosion
  'wall_corrosion': 'Corrosion',
  'Corrosion': 'Corrosion',
  
  // Cosmetic/Stains
  'wall_stain': 'Stain',
  'wall_deterioration': 'Deterioration',
  'Stain': 'Stain',
  'Deterioration': 'Deterioration',
  
  // Safe/No damage
  'window': 'Safe',
  'Window': 'Safe',
  'broken window': 'Safe', // Broken window is cosmetic, not structural
  'opened valve': 'Safe',
  'closed valve': 'Safe',
  'wall flange': 'Safe',
  'building': 'Safe',
  'roof': 'Safe',
  'toilet': 'Safe',
  'wastafel': 'Safe', // Dutch for sink
  'douche': 'Safe', // Shower
  'designradiator': 'Safe', // Radiator
  'bath': 'Safe', // Bathtub
  'Normal wall': 'Safe',
  
  // Structural damage
  'Damaged Tower': 'Structural Crack',
  'damage': 'Structural Crack', // Default to structural if generic
  'Animal-Damage': 'Animal Damage',
  'damaged roof': 'Damaged Roof',
  'Damaged_Roof': 'Damaged Roof',
  'hole': 'Structural Crack', // Holes can be structural
  'Hole': 'Structural Crack',
};

/**
 * Classes that are considered critical hazards
 */
const criticalHazardClasses = new Set([
  'Structural Crack',
  'Foundation Crack',
  'Electrical Hazard',
  'Corrosion', // If structural
  'Damaged Roof', // Structural roof damage
]);

/**
 * Determine if a class is a critical hazard
 */
function isCriticalHazard(className: string): boolean {
  return criticalHazardClasses.has(className);
}

/**
 * Normalize class name using mapping
 */
function normalizeClass(tfClass: string): string {
  const normalized = tfClass.trim();
  return classMapping[normalized] || normalized;
}

/**
 * Determine primary class from multiple annotations
 * Priority: Critical hazards > Most frequent > First non-safe
 */
function determinePrimaryClass(classes: string[]): string {
  if (classes.length === 0) return 'Safe';
  
  // Count class occurrences
  const classCounts = new Map<string, number>();
  for (const cls of classes) {
    classCounts.set(cls, (classCounts.get(cls) || 0) + 1);
  }
  
  // Priority 1: Critical hazards (always prioritize)
  for (const [cls, count] of classCounts.entries()) {
    if (isCriticalHazard(cls)) {
      return cls;
    }
  }
  
  // Priority 2: Most frequent non-safe class
  let primaryClass = 'Safe';
  let maxCount = 0;
  
  for (const [cls, count] of classCounts.entries()) {
    if (cls !== 'Safe' && count > maxCount) {
      primaryClass = cls;
      maxCount = count;
    }
  }
  
  // If all are safe or no damage detected
  if (primaryClass === 'Safe' && classCounts.size > 0) {
    // Check if we have any damage classes at all
    const hasDamage = Array.from(classCounts.keys()).some(cls => cls !== 'Safe');
    if (!hasDamage) {
      return 'Safe';
    }
  }
  
  return primaryClass;
}

/**
 * Convert annotations CSV to ground truth CSV
 */
function convertAnnotations(
  annotationsPath: string,
  outputPath: string,
  baseImageUrl?: string
): void {
  console.log('📖 Reading annotations file...');
  const content = readFileSync(annotationsPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  if (lines.length < 2) {
    throw new Error('Annotations file must have at least a header row and one data row');
  }
  
  console.log(`   Found ${lines.length - 1} annotation rows`);
  
  // Parse annotations
  const annotations: AnnotationRow[] = [];
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
    
    if (parts.length >= 8) {
      try {
        annotations.push({
          filename: parts[0],
          width: Number.parseInt(parts[1], 10) || 640,
          height: Number.parseInt(parts[2], 10) || 640,
          class: parts[3],
          xmin: Number.parseInt(parts[4], 10) || 0,
          ymin: Number.parseInt(parts[5], 10) || 0,
          xmax: Number.parseInt(parts[6], 10) || 640,
          ymax: Number.parseInt(parts[7], 10) || 640,
        });
      } catch (error) {
        console.warn(`   Skipping malformed row ${i + 1}: ${error}`);
      }
    }
  }
  
  console.log(`✓ Parsed ${annotations.length} annotations`);
  
  // Group by filename and normalize classes
  const imageMap = new Map<string, string[]>();
  
  for (const ann of annotations) {
    if (!imageMap.has(ann.filename)) {
      imageMap.set(ann.filename, []);
    }
    const normalized = normalizeClass(ann.class);
    imageMap.get(ann.filename)!.push(normalized);
  }
  
  console.log(`✓ Found ${imageMap.size} unique images`);
  
  // Generate ground truth rows
  const groundTruthRows: GroundTruthRow[] = [];
  const classStats = new Map<string, number>();
  
  for (const [filename, classes] of imageMap.entries()) {
    const primaryClass = determinePrimaryClass(classes);
    const criticalHazard = isCriticalHazard(primaryClass);
    
    // Track class distribution
    classStats.set(primaryClass, (classStats.get(primaryClass) || 0) + 1);
    
    // Generate image URL
    let imageUrl: string;
    if (baseImageUrl) {
      // Use provided base URL
      imageUrl = baseImageUrl.endsWith('/') 
        ? `${baseImageUrl}${filename}`
        : `${baseImageUrl}/${filename}`;
    } else {
      // Use placeholder (user will need to update)
      imageUrl = `file:///${filename}`;
    }
    
    groundTruthRows.push({
      filename,
      image_url: imageUrl,
      true_class: primaryClass,
      critical_hazard: criticalHazard,
      // Optional fields left empty - user can fill in if they have this data
      property_type: undefined,
      property_age: undefined,
      region: undefined,
    });
  }
  
  // Write CSV
  const header = 'filename,image_url,true_class,critical_hazard,property_type,property_age,region\n';
  const rows = groundTruthRows.map(row => {
    const values = [
      row.filename,
      row.image_url,
      row.true_class,
      row.critical_hazard.toString(),
      row.property_type || '',
      row.property_age?.toString() || '',
      row.region || '',
    ];
    
    // Escape values that contain commas or quotes
    return values.map(v => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    }).join(',');
  }).join('\n');
  
  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (outputDir && outputDir !== '.') {
    try {
      require('fs').mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
    }
  }
  
  writeFileSync(outputPath, header + rows, 'utf-8');
  
  // Print summary
  console.log('\n✅ Conversion Complete!');
  console.log(`   Output: ${outputPath}`);
  console.log(`   Total images: ${groundTruthRows.length}`);
  console.log(`   Critical hazards: ${groundTruthRows.filter(r => r.critical_hazard).length}`);
  console.log(`   Safe images: ${groundTruthRows.filter(r => r.true_class === 'Safe').length}`);
  
  console.log('\n📊 Class Distribution:');
  const sortedStats = Array.from(classStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10
  
  for (const [className, count] of sortedStats) {
    const percentage = ((count / groundTruthRows.length) * 100).toFixed(1);
    console.log(`   ${className}: ${count} (${percentage}%)`);
  }
  
  if (!baseImageUrl) {
    console.log('\n⚠️  Note: Image URLs are placeholders (file:///)');
    console.log('   You need to:');
    console.log('   1. Upload images to cloud storage (GCS, S3, Supabase Storage)');
    console.log('   2. Update image_url column in the CSV with actual URLs');
    console.log('   3. Or re-run with --base-image-url parameter');
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let annotationsPath = 'C:\\Users\\Djodjo.Nkouka.ERICCOLE\\Downloads\\Building Defect Detection 7.v2i.tensorflow\\train\\_annotations.csv';
  let outputPath = 'training-data/ground-truth-labels.csv';
  let baseImageUrl: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--annotations-path' && i + 1 < args.length) {
      annotationsPath = args[i + 1];
      i++;
    } else if (args[i] === '--output-path' && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '--base-image-url' && i + 1 < args.length) {
      baseImageUrl = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: npx tsx scripts/convert-tensorflow-to-ground-truth.ts [options]

Options:
  --annotations-path <path>  Path to _annotations.csv file
  --output-path <path>       Output CSV path (default: training-data/ground-truth-labels.csv)
  --base-image-url <url>     Base URL for images (e.g., https://storage.googleapis.com/bucket/images)
  --help, -h                 Show this help message

Example:
  npx tsx scripts/convert-tensorflow-to-ground-truth.ts \\
    --annotations-path "C:\\path\\to\\_annotations.csv" \\
    --output-path training-data/ground-truth-labels.csv \\
    --base-image-url "https://storage.googleapis.com/your-bucket/images"
      `);
      process.exit(0);
    }
  }
  
  try {
    convertAnnotations(annotationsPath, outputPath, baseImageUrl);
    console.log('\n✅ Success! Your ground truth CSV is ready.');
    console.log(`   Next step: Review and update image URLs if needed, then run:`);
    console.log(`   npx tsx scripts/run-shadow-mode-batch.ts ${outputPath}`);
  } catch (error) {
    console.error('\n❌ Conversion failed:', error);
    if (error instanceof Error) {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

