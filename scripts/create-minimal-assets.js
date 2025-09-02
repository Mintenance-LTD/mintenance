#!/usr/bin/env node

/**
 * Create minimal PNG assets for building
 * These are very basic 1x1 pixel PNGs that satisfy build requirements
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Minimal 1x1 transparent PNG (base64 encoded)
const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const minimalPngBuffer = Buffer.from(minimalPngBase64, 'base64');

// Blue 1x1 PNG for icons
const bluePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR42mJgYGBgZGBgYAAAAAQAAg8LkqQAAAAASUVORK5CYII=';
const bluePngBuffer = Buffer.from(bluePngBase64, 'base64');

// Assets to create
const assets = [
  { name: 'icon.png', buffer: bluePngBuffer },
  { name: 'splash.png', buffer: minimalPngBuffer },
  { name: 'adaptive-icon.png', buffer: bluePngBuffer },
  { name: 'favicon.png', buffer: bluePngBuffer }
];

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create the minimal PNG files
assets.forEach(asset => {
  const filePath = path.join(assetsDir, asset.name);
  fs.writeFileSync(filePath, asset.buffer);
  console.log(`✅ Created minimal ${asset.name}`);
});

console.log('\n🎉 Minimal PNG assets created successfully!');
console.log('📝 These are 1x1 pixel PNGs that satisfy build requirements.');
console.log('🎨 You should replace these with proper branded assets before store submission.');
console.log('');
console.log('For better quality assets, you can:');
console.log('1. Use the SVG files created earlier with an online converter');
console.log('2. Create proper assets with your design tools');
console.log('3. Use the asset specifications in assets/README.md');