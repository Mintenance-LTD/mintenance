/**
 * Create a mock ONNX model for testing the deployment pipeline
 * This allows us to test the full system while waiting for training
 */

import * as fs from 'fs';
import * as path from 'path';

// Create mock model directory structure
const modelDir = path.join(__dirname, '../yolo_dataset_full/maintenance_production/v1.0/weights');
fs.mkdirSync(modelDir, { recursive: true });

// Create a mock ONNX file (small placeholder)
// In production, this will be replaced by the real trained model
const mockOnnxPath = path.join(modelDir, 'best.onnx');

// Create a minimal ONNX-like file structure
// This is just for testing the deployment pipeline
const mockModelData = Buffer.from([
  0x08, 0x01, // ONNX version
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Producer name
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Producer version
  // ... minimal valid ONNX structure
]);

// For now, just create an empty file as placeholder
fs.writeFileSync(mockOnnxPath, mockModelData);

console.log('✅ Mock model created at:', mockOnnxPath);
console.log('📝 Note: This is a placeholder for testing deployment');
console.log('⏳ Replace with real model when training completes');

// Also create a mock PT file for reference
const mockPtPath = path.join(modelDir, 'best.pt');
fs.writeFileSync(mockPtPath, Buffer.from('MOCK_PYTORCH_MODEL'));

console.log('✅ Mock PT model created at:', mockPtPath);