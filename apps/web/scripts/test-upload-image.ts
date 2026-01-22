/**
 * Test image upload to maintenance detection API
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const API_URL = 'http://localhost:3000/api/maintenance/detect';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testImageUpload() {
  console.log('🧪 Testing Maintenance Detection with Real Image\n');
  console.log('='.repeat(60));

  // First, let's download a test image from the training set
  const { data: files } = await supabase.storage
    .from('training-images')
    .list('', { limit: 1 });

  if (!files || files.length === 0) {
    console.error('❌ No training images found');
    return;
  }

  const testImageName = files[0].name;
  console.log(`📸 Using test image: ${testImageName}`);

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('training-images')
    .getPublicUrl(testImageName);

  console.log(`📍 Image URL: ${publicUrl}`);

  // Download the image
  const imageResponse = await fetch(publicUrl);
  const imageBuffer = await imageResponse.buffer();

  const localImagePath = path.join(__dirname, 'test-image.jpg');
  fs.writeFileSync(localImagePath, imageBuffer);
  console.log('✅ Image downloaded locally');

  // Prepare form data
  const formData = new FormData();
  formData.append('image', fs.createReadStream(localImagePath), {
    filename: testImageName,
    contentType: 'image/jpeg'
  });
  formData.append('description', 'Testing maintenance detection with real training image');
  formData.append('urgency', 'medium');

  console.log('\n📤 Uploading to maintenance detection API...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders()
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`❌ API Error (${response.status}):`);
      console.error(responseText.substring(0, 500));
      return;
    }

    const result = JSON.parse(responseText);

    if (result.success) {
      console.log('\n✅ Detection successful!\n');

      const assessment = result.assessment;

      console.log('📊 DETECTION RESULTS:');
      console.log('='.repeat(40));

      if (assessment.detections && assessment.detections.length > 0) {
        console.log('\n🔍 Detected Issues:');
        assessment.detections.forEach((detection: any, idx: number) => {
          console.log(`  ${idx + 1}. ${detection.class}`);
          console.log(`     Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
          console.log(`     Coverage: ${(detection.area * 100).toFixed(2)}% of image`);
        });
      } else {
        console.log('\n⚠️ No specific issues detected (using mock data)');
      }

      console.log('\n📋 ASSESSMENT DETAILS:');
      console.log(`  Contractor Type: ${assessment.contractorType}`);
      console.log(`  Severity: ${assessment.severity}`);
      console.log(`  Urgency: ${assessment.urgency}`);
      console.log(`  Estimated Cost: ${assessment.estimatedCost}`);
      console.log(`  Estimated Time: ${assessment.estimatedTime}`);

      if (assessment.materials && assessment.materials.length > 0) {
        console.log('\n🛠️ Materials Needed:');
        assessment.materials.forEach((material: string) => {
          console.log(`  • ${material}`);
        });
      }

      if (assessment.tools && assessment.tools.length > 0) {
        console.log('\n🔧 Tools Required:');
        assessment.tools.forEach((tool: string) => {
          console.log(`  • ${tool}`);
        });
      }

      console.log('\n📍 Stored Image URL:', assessment.imageUrl);
      console.log('🆔 Assessment ID:', assessment.id);

    } else {
      console.log('❌ Detection failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }

  // Clean up
  if (fs.existsSync(localImagePath)) {
    fs.unlinkSync(localImagePath);
    console.log('\n🧹 Cleaned up test image');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test Complete!');
}

// Run the test
testImageUpload().catch(console.error);