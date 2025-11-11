# Screenshot Setup Instructions

## Overview
The landing page hero section has been updated to display real app screenshots in a rotating carousel. The component is ready, but you need to copy the screenshots to the public directory.

## Screenshots Captured

The following screenshots were taken and saved to a temporary directory:

1. **homeowner-dashboard.png** - Homeowner dashboard showing job management
2. **homeowner-jobs.png** - Homeowner jobs page showing active projects  
3. **contractor-dashboard-enhanced.png** - Contractor dashboard with analytics
4. **contractor-jobs.png** - Contractor jobs page showing available opportunities

## Screenshot Locations

**Temporary Location:**
```
C:\Users\DJODJO~1.ERI\AppData\Local\Temp\cursor-browser-extension\1762786485252\
```

**Target Location:**
```
apps/web/public/screenshots/
```

## Copy Instructions

### Option 1: Manual Copy (Windows)
1. Navigate to the temp directory: `
2. Copy these files:
   - `homeowner-dashboard.png`
   - `homeowner-jobs.png`
   - `contractor-dashboard-enhanced.png`
   - `contractor-jobs.png`
3. Paste them into: `apps/web/public/screenshots/`

### Option 2: PowerShell Command
```powershell
Copy-Item "C:\Users\DJODJO~1.ERI\AppData\Local\Temp\cursor-browser-extension\1762786485252\*.png" -Destination "apps/web/public/screenshots/" -Force
```

### Option 3: File Explorer
1. Open File Explorer
2. Navigate to: `C:\Users\Djodjo.Nkouka.ERICCOLE\AppData\Local\Temp\cursor-browser-extension\1762786485252\`
3. Select all `.png` files
4. Copy them
5. Navigate to: `apps/web/public/screenshots/`
6. Paste the files

## Component Features

The updated `HeroSection` component includes:

✅ **Auto-rotating carousel** - Changes screenshots every 5 seconds
✅ **Manual navigation** - Click indicators to jump to specific screenshots
✅ **Smooth transitions** - Fade animations between screenshots
✅ **Fallback handling** - Graceful degradation if images don't load
✅ **Accessibility** - Proper alt text and ARIA labels
✅ **Performance** - Priority loading for first image

## Screenshot Rotation Order

1. Homeowner Dashboard (starts here)
2. Homeowner Jobs
3. Contractor Dashboard Enhanced
4. Contractor Jobs

## Testing

After copying the screenshots:
1. Restart your dev server if needed
2. Navigate to `http://localhost:3000/`
3. Verify the screenshots rotate automatically
4. Test clicking the slide indicators
5. Check that images load correctly

## Notes

- Screenshots are set to `unoptimized` for faster loading during development
- Images use `object-cover object-top` to ensure proper framing in the phone mockup
- The component includes error handling if screenshots fail to load
- All screenshots are full-page captures showing the actual app interface

