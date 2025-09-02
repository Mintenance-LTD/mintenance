# 🎨 App Assets

This directory contains the required assets for the Mintenance app.

## Required Assets:
- `icon.png` - App icon (1024x1024)
- `splash.png` - Splash screen (1242x2436 for iOS, various for Android)
- `adaptive-icon.png` - Android adaptive icon foreground (1024x1024)
- `favicon.png` - Web favicon (48x48)

## Current Status:
These are placeholder assets generated for building. Replace with final branded assets before store submission.

## Asset Specifications:

### App Icon (icon.png)
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Content: Should not include rounded corners (iOS and Android will apply their own)
- Background: Avoid transparent backgrounds for better visibility

### Splash Screen (splash.png)
- Size: 1242x2436 pixels (iPhone 12/13/14 Pro Max size)
- Format: PNG
- Content: Centered logo/branding with background color
- Background: Match the backgroundColor in app.config.js

### Adaptive Icon (adaptive-icon.png)
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Content: Foreground part of Android adaptive icon
- Safe area: Keep important content within 66% center circle

### Favicon (favicon.png)
- Size: 48x48 pixels
- Format: PNG
- Content: Simplified version of app icon
- Background: Solid background recommended

## TODO for Production:
1. Replace all placeholder assets with branded designs
2. Test assets on various device sizes
3. Ensure compliance with App Store and Google Play guidelines
4. Generate all required icon sizes for different platforms