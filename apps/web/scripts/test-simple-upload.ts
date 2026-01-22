/**
 * Simple test for maintenance detection API with synthetic image
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const API_URL = 'http://localhost:3000/api/maintenance/detect';

async function testSimpleUpload() {
  console.log('🧪 Testing Maintenance Detection API\n');
  console.log('='.repeat(60));

  // Create a simple test image using a gradient to simulate damage
  const Jimp = require('jimp');

  try {
    // Create a 640x640 image
    const image = await Jimp.create(640, 640, 0xFFFFFFFF); // White background

    // Add a brown gradient to simulate water damage
    for (let y = 200; y < 400; y++) {
      for (let x = 150; x < 450; x++) {
        const intensity = Math.random() * 0.3 + 0.4;
        const color = Jimp.rgbaToInt(
          Math.floor(139 * intensity), // Brown R
          Math.floor(69 * intensity),  // Brown G
          Math.floor(19 * intensity),  // Brown B
          255
        );
        image.setPixelColor(color, x, y);
      }
    }

    // Save the test image
    const testImagePath = path.join(__dirname, 'test-damage.jpg');
    await image.writeAsync(testImagePath);
    console.log('✅ Test image created');

    // Prepare form data
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath), {
      filename: 'test-damage.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('description', 'Water damage on ceiling from leak');
    formData.append('urgency', 'high');

    console.log('📤 Uploading to API...\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders()
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`❌ API Error (${response.status})`);
      console.error(responseText.substring(0, 500));
      return;
    }

    const result = JSON.parse(responseText);

    if (result.success) {
      console.log('✅ DETECTION SUCCESSFUL!\n');
      console.log('📊 Results:');
      console.log(JSON.stringify(result.assessment, null, 2));
    } else {
      console.log('❌ Detection failed:', result.error);
    }

    // Clean up
    fs.unlinkSync(testImagePath);

  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n' + '='.repeat(60));
}

// Check if jimp is installed
try {
  require.resolve('jimp');
  testSimpleUpload();
} catch (e) {
  console.log('Installing jimp for image generation...');
  const { execSync } = require('child_process');
  execSync('npm install jimp', { stdio: 'inherit' });
  console.log('✅ Jimp installed, please run the script again');
}