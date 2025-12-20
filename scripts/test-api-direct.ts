/**
 * Direct test of maintenance detection API using existing images
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const API_URL = 'http://localhost:3000/api/maintenance/detect';

async function testAPIDirectly() {
  console.log('🧪 Testing Maintenance Detection API\n');
  console.log('='.repeat(60));

  // Use one of our downloaded training images
  const trainingImagesDir = path.join(__dirname, '../yolo_dataset_full/train/images');

  // Check if we have any training images
  const hasImages = fs.existsSync(trainingImagesDir) &&
                    fs.readdirSync(trainingImagesDir).some(f =>
                      f.endsWith('.jpg') || f.endsWith('.png'));

  if (!hasImages) {
    console.log('📝 No local training images found');
    console.log('📸 Creating test image...');

    // Create a simple 1x1 pixel image as base64
    const minimalImage = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
      'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
      'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIA' +
      'AhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEB' +
      'AQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A' +
      '/9k=',
      'base64'
    );

    const testImagePath = path.join(__dirname, 'minimal-test.jpg');
    fs.writeFileSync(testImagePath, minimalImage);

    await testWithImage(testImagePath, 'minimal-test.jpg');

    // Clean up
    fs.unlinkSync(testImagePath);

  } else {
    // Use first available training image
    const files = fs.readdirSync(trainingImagesDir);
    const imageFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

    if (imageFiles.length > 0) {
      const testImage = imageFiles[0];
      const testImagePath = path.join(trainingImagesDir, testImage);
      console.log(`📸 Using training image: ${testImage}`);

      await testWithImage(testImagePath, testImage);
    } else {
      console.log('❌ No image files found in training directory');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test Complete!');
}

async function testWithImage(imagePath: string, filename: string) {
  try {
    // Prepare form data
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath), {
      filename: filename,
      contentType: 'image/jpeg'
    });
    formData.append('description', 'Testing maintenance detection system');
    formData.append('urgency', 'medium');

    console.log('📤 Uploading to API...\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders()
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`❌ API Error (${response.status})`);

      // Try to parse error as JSON
      try {
        const error = JSON.parse(responseText);
        console.error('Error details:', error);
      } catch {
        // If not JSON, show as text
        console.error('Error response:', responseText.substring(0, 500));
      }
      return;
    }

    const result = JSON.parse(responseText);

    if (result.success) {
      console.log('✅ DETECTION SUCCESSFUL!\n');

      const assessment = result.assessment;

      console.log('📊 DETECTION RESULTS:');
      console.log('='.repeat(40));

      // Check if using real model or mock
      if (assessment.detections && assessment.detections.length > 0) {
        const isRealModel = assessment.detections[0].bbox &&
                            assessment.detections[0].bbox.length === 4;

        if (isRealModel) {
          console.log('\n🤖 Using: REAL YOLO MODEL');
        } else {
          console.log('\n🎭 Using: MOCK MODEL (training still in progress)');
        }

        console.log('\n🔍 Detected Issues:');
        assessment.detections.forEach((detection: any, idx: number) => {
          console.log(`  ${idx + 1}. ${detection.class}`);
          console.log(`     Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
          if (detection.bbox) {
            console.log(`     Location: [${detection.bbox.map((v: number) => v.toFixed(2)).join(', ')}]`);
          }
          console.log(`     Coverage: ${(detection.area * 100).toFixed(2)}% of image`);
        });
      }

      console.log('\n📋 ASSESSMENT:');
      console.log(`  Issue Type: ${assessment.detections?.[0]?.class || 'general_damage'}`);
      console.log(`  Contractor: ${assessment.contractorType}`);
      console.log(`  Severity: ${assessment.severity}`);
      console.log(`  Cost: ${assessment.estimatedCost}`);
      console.log(`  Time: ${assessment.estimatedTime}`);

      if (assessment.materials?.length > 0) {
        console.log('\n🛠️ Materials:');
        assessment.materials.slice(0, 3).forEach((m: string) =>
          console.log(`  • ${m}`)
        );
      }

      if (assessment.tools?.length > 0) {
        console.log('\n🔧 Tools:');
        assessment.tools.slice(0, 3).forEach((t: string) =>
          console.log(`  • ${t}`)
        );
      }

      console.log('\n📍 Image stored at:', assessment.imageUrl);
      console.log('🆔 Assessment ID:', assessment.id);

    } else {
      console.log('❌ Detection failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run the test
testAPIDirectly().catch(console.error);