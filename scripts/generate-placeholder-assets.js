#!/usr/bin/env node

/**
 * 🎨 Generate Placeholder Assets for Mintenance App
 * Creates basic placeholder images for app building
 */

const fs = require('fs');
const path = require('path');

// Simple SVG to PNG conversion using node canvas might not be available
// So we'll create a simple HTML file that can be used to generate images

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// SVG content for app icon
const iconSVG = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#007AFF" rx="100"/>
  <text x="512" y="580" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">M</text>
  <circle cx="512" cy="300" r="80" fill="white" opacity="0.9"/>
  <rect x="472" y="320" width="80" height="20" fill="white" opacity="0.9" rx="10"/>
</svg>`;

// SVG content for splash screen
const splashSVG = `<svg width="1242" height="2436" xmlns="http://www.w3.org/2000/svg">
  <rect width="1242" height="2436" fill="#ffffff"/>
  <g transform="translate(621,1218)">
    <rect x="-100" y="-100" width="200" height="200" fill="#007AFF" rx="20"/>
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">M</text>
    <circle cx="0" cy="-40" r="20" fill="white" opacity="0.9"/>
    <rect x="-20" y="-30" width="40" height="8" fill="white" opacity="0.9" rx="4"/>
  </g>
  <text x="621" y="1400" font-family="Arial, sans-serif" font-size="48" font-weight="normal" text-anchor="middle" fill="#666">Mintenance</text>
</svg>`;

// SVG content for adaptive icon
const adaptiveIconSVG = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <circle cx="512" cy="512" r="340" fill="#007AFF"/>
  <text x="512" y="600" font-family="Arial, sans-serif" font-size="160" font-weight="bold" text-anchor="middle" fill="white">M</text>
  <circle cx="512" cy="350" r="60" fill="white" opacity="0.9"/>
  <rect x="482" y="365" width="60" height="15" fill="white" opacity="0.9" rx="7"/>
</svg>`;

// SVG content for favicon
const faviconSVG = `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#007AFF" rx="4"/>
  <text x="24" y="32" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="white">M</text>
</svg>`;

// Write SVG files
const assets = [
  { name: 'icon.svg', content: iconSVG },
  { name: 'splash.svg', content: splashSVG },
  { name: 'adaptive-icon.svg', content: adaptiveIconSVG },
  { name: 'favicon.svg', content: faviconSVG }
];

assets.forEach(asset => {
  const filePath = path.join(assetsDir, asset.name);
  fs.writeFileSync(filePath, asset.content);
  console.log(`✅ Created ${asset.name}`);
});

// Create instructions for converting SVG to PNG
const conversionInstructions = `# 🔄 Asset Conversion Instructions

## Option 1: Online Conversion
1. Go to https://convertio.co/svg-png/ or similar
2. Upload each .svg file from the assets directory
3. Set appropriate dimensions:
   - icon.svg → icon.png (1024x1024)
   - splash.svg → splash.png (1242x2436) 
   - adaptive-icon.svg → adaptive-icon.png (1024x1024)
   - favicon.svg → favicon.png (48x48)
4. Download and replace the .svg files

## Option 2: Using Inkscape (if installed)
\`\`\`bash
# Install Inkscape: https://inkscape.org/
cd assets
inkscape icon.svg --export-type=png --export-width=1024 --export-height=1024 --export-filename=icon.png
inkscape splash.svg --export-type=png --export-width=1242 --export-height=2436 --export-filename=splash.png
inkscape adaptive-icon.svg --export-type=png --export-width=1024 --export-height=1024 --export-filename=adaptive-icon.png
inkscape favicon.svg --export-type=png --export-width=48 --export-height=48 --export-filename=favicon.png
\`\`\`

## Option 3: Using ImageMagick (if installed)
\`\`\`bash
cd assets
magick icon.svg -resize 1024x1024 icon.png
magick splash.svg -resize 1242x2436 splash.png  
magick adaptive-icon.svg -resize 1024x1024 adaptive-icon.png
magick favicon.svg -resize 48x48 favicon.png
\`\`\`

After conversion, you can delete the .svg files and keep only the .png files.
`;

fs.writeFileSync(path.join(assetsDir, 'CONVERSION_INSTRUCTIONS.md'), conversionInstructions);
console.log('✅ Created CONVERSION_INSTRUCTIONS.md');

console.log('\n🎨 Placeholder assets generated successfully!');
console.log('📝 Next steps:');
console.log('1. Convert SVG files to PNG using one of the methods in CONVERSION_INSTRUCTIONS.md');
console.log('2. Or use the simple PNG assets created by running this script with --png flag');
console.log('3. Replace with final branded assets before store submission');

// For immediate building needs, let's create very simple PNG files using ASCII art approach
if (process.argv.includes('--png')) {
  console.log('\n🔧 Creating basic PNG placeholders...');
  
  // This would require a canvas library, so let's create a different solution
  const simplePngInstructions = `
To create immediate PNG files for building:

1. Open any image editor (even MS Paint)
2. Create these files with solid colors:

- icon.png: 1024x1024, blue background (#007AFF)
- splash.png: 1242x2436, white background (#FFFFFF)  
- adaptive-icon.png: 1024x1024, blue background (#007AFF)
- favicon.png: 48x48, blue background (#007AFF)

This will allow the build to complete while you prepare proper assets.
`;
  
  console.log(simplePngInstructions);
}