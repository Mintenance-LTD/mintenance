# Manual Testing Checklist - Map Systems

**Date**: October 31, 2025  
**Purpose**: Comprehensive manual testing before production deployment  
**Estimated Time**: 2-3 hours

---

## 📋 Pre-Testing Setup

### Environment Setup

- [ ] API key configured in `.env.local`
- [ ] Dev server running (`npm run dev`)
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on multiple devices (Desktop, Tablet, Mobile)

### Test Data Required

- [ ] At least 5 contractors with locations
- [ ] At least 20 contractors for clustering test
- [ ] At least 2 contractors with service areas
- [ ] At least 2 overlapping service areas
- [ ] 1 contractor without location data

---

## 1. Browse Map - Desktop

### Map Loading

- [ ] **Navigate to** `/contractors`
- [ ] **Toggle to** Map View
- [ ] **Verify**: Map loads within 2 seconds
- [ ] **Verify**: No console errors
- [ ] **Verify**: Loading spinner appears during load
- [ ] **Verify**: Contractor markers appear at correct locations

### Markers & Clustering

- [ ] **Verify**: All contractors shown (no 15 limit)
- [ ] **Verify**: Markers positioned at real lat/lng
- [ ] **Verify**: Clustering activates with 20+ contractors
- [ ] **Verify**: Cluster count badge is accurate
- [ ] **Click**: Cluster to zoom in
- [ ] **Verify**: Markers expand when zoomed

### Map Controls

- [ ] **Click**: Zoom in (+) button
- [ ] **Click**: Zoom out (-) button
- [ ] **Drag**: Map to pan
- [ ] **Click**: Recenter button (if user location granted)
- [ ] **Verify**: Map recenters to user location
- [ ] **Click**: Map type toggle (if available)
- [ ] **Verify**: Satellite/terrain views work

### Marker Interactions

- [ ] **Hover**: Over marker
- [ ] **Verify**: Info window appears
- [ ] **Verify**: Info window shows contractor name, city, rating
- [ ] **Hover**: Over different marker
- [ ] **Verify**: Previous info window closes
- [ ] **Click**: Marker
- [ ] **Verify**: Modal opens with contractor details
- [ ] **Verify**: Modal shows name, rating, location, distance
- [ ] **Click**: "View Full Profile" in modal
- [ ] **Verify**: Navigate to contractor profile page

### Service Area Circles

- [ ] **Verify**: Service area circles visible by default
- [ ] **Verify**: Circles color-coded (green=active, gray=inactive)
- [ ] **Click**: "Show/Hide Coverage Areas" toggle
- [ ] **Verify**: Circles disappear
- [ ] **Verify**: Button shows "Show Coverage Areas"
- [ ] **Click**: Toggle again
- [ ] **Verify**: Circles reappear
- [ ] **Verify**: Loading indicator shows during fetch

### Contractor Sidebar

- [ ] **Verify**: Contractor count accurate
- [ ] **Verify**: Contractors sorted by relevance/distance
- [ ] **Click**: Contractor card in sidebar
- [ ] **Verify**: Opens same modal as marker click
- [ ] **Scroll**: Sidebar list
- [ ] **Verify**: Smooth scrolling
- [ ] **Verify**: Sticky header stays visible

---

## 2. Browse Map - Mobile

### Responsive Layout

- [ ] **Resize**: Browser to 768px width
- [ ] **Verify**: Layout stacks vertically (map top, list bottom)
- [ ] **Verify**: Map height adjusts appropriately
- [ ] **Verify**: List scrolls smoothly
- [ ] **Resize**: Browser to 375px width (iPhone)
- [ ] **Verify**: Layout still readable and functional

### Touch Interactions

- [ ] **Tap**: Marker
- [ ] **Verify**: Modal opens
- [ ] **Pinch**: To zoom
- [ ] **Verify**: Map zooms smoothly
- [ ] **Swipe**: To pan
- [ ] **Verify**: Map pans smoothly
- [ ] **Tap**: Toggle button
- [ ] **Verify**: Touch target large enough (44px minimum)
- [ ] **Verify**: No accidental double-taps

### Mobile Performance

- [ ] **Verify**: Map loads in < 3 seconds on mobile
- [ ] **Verify**: Scroll performance is 60fps
- [ ] **Verify**: No layout shift during load
- [ ] **Verify**: Touch response < 100ms

---

## 3. Service Areas Map - Desktop

### Map View

- [ ] **Navigate to** `/contractor/service-areas`
- [ ] **Click**: "Map View" button
- [ ] **Verify**: Map loads with service area circles
- [ ] **Verify**: Legend displays correctly
- [ ] **Verify**: Coverage summary shows (total areas, active count)

### Service Area Interactions

- [ ] **Click**: Service area circle
- [ ] **Verify**: Switches to table view
- [ ] **Verify**: Selected area highlighted in table
- [ ] **Click**: Service area marker
- [ ] **Verify**: Same behavior as circle click

### Table View

- [ ] **Click**: "Table View" button
- [ ] **Verify**: Table displays with all areas
- [ ] **Verify**: Columns: Location, Radius, Coverage, Priority, Status, Actions
- [ ] **Click**: "Activate" button on inactive area
- [ ] **Verify**: Status changes to "Active"
- [ ] **Verify**: Circle color changes to green on map (if map visible)
- [ ] **Click**: "Deactivate" button on active area
- [ ] **Verify**: Status changes to "Inactive"
- [ ] **Verify**: Circle color changes to gray on map

### Adding Service Areas

- [ ] **Enter**: New location (e.g., "London")
- [ ] **Select**: Radius (e.g., 25km)
- [ ] **Click**: "Add area" button
- [ ] **Verify**: Loading state shows
- [ ] **Verify**: New area appears in table
- [ ] **Verify**: New area appears on map (if map view)
- [ ] **Verify**: Success message displays

### Overlap Detection

- [ ] **Add**: Service area that overlaps existing one
- [ ] **Verify**: Warning banner appears
- [ ] **Verify**: Warning shows severity level (high/medium/low)
- [ ] **Verify**: Warning suggests action (e.g., "reduce radius")
- [ ] **Verify**: Up to 3 warnings show at once

---

## 4. Service Areas Map - Mobile

### Responsive Behavior

- [ ] **Resize**: Browser to mobile width
- [ ] **Verify**: Map view adapts (full width)
- [ ] **Verify**: Toggle buttons stack/resize appropriately
- [ ] **Verify**: Table scrolls horizontally if needed
- [ ] **Tap**: Map view toggle
- [ ] **Verify**: Map displays correctly
- [ ] **Tap**: Table view toggle
- [ ] **Verify**: Table displays correctly

---

## 5. Accessibility Testing

### Keyboard Navigation

- [ ] **Press**: Tab to navigate
- [ ] **Verify**: Focus order is logical (left-to-right, top-to-bottom)
- [ ] **Verify**: Focus indicator visible on all elements
- [ ] **Press**: Tab to reach map
- [ ] **Press**: Arrow keys to pan map (if supported)
- [ ] **Press**: +/- to zoom (if supported)
- [ ] **Tab**: To contractor card
- [ ] **Press**: Enter to open profile
- [ ] **Press**: Escape to close modal

### Screen Reader

- [ ] **Enable**: Screen reader (VoiceOver/NVDA/JAWS)
- [ ] **Navigate**: To browse map
- [ ] **Verify**: "Interactive map showing contractor locations" announced
- [ ] **Navigate**: To contractor card
- [ ] **Verify**: "View profile for [Name], rated [X] stars, [Y] km away" announced
- [ ] **Navigate**: To toggle button
- [ ] **Verify**: "Hide service areas" or "Show service areas" announced
- [ ] **Verify**: Switch role announced

### Color Contrast

- [ ] **Check**: Text on backgrounds (4.5:1 ratio)
- [ ] **Check**: Icons and UI elements (3:1 ratio)
- [ ] **Check**: Status badges readable
- [ ] **Check**: Service area circles distinguishable

---

## 6. Error Handling & Edge Cases

### No Location Data

- [ ] **Test**: Contractor with no lat/lng
- [ ] **Verify**: Doesn't appear on map
- [ ] **Verify**: No console errors

### No Service Areas

- [ ] **Navigate to**: Contractor with no service areas
- [ ] **Toggle to**: Map view on service areas page
- [ ] **Verify**: Empty state message shows
- [ ] **Verify**: Helpful messaging ("Add your first service area...")

### API Failures

- [ ] **Disable**: Network in DevTools
- [ ] **Reload**: Browse map page
- [ ] **Verify**: Error message displays
- [ ] **Verify**: "Try Again" button appears
- [ ] **Click**: "Try Again"
- [ ] **Verify**: Retries loading

### Loading States

- [ ] **Throttle**: Network to Slow 3G
- [ ] **Reload**: Map page
- [ ] **Verify**: Loading spinner shows
- [ ] **Verify**: "Loading map..." message shows
- [ ] **Wait**: For map to load
- [ ] **Verify**: Smooth transition from loading to map

### Large Datasets

- [ ] **Test**: With 100+ contractors
- [ ] **Verify**: Map doesn't lag
- [ ] **Verify**: Clustering prevents overcrowding
- [ ] **Verify**: Sidebar list scrolls smoothly

---

## 7. Browser Compatibility

### Chrome

- [ ] All tests pass
- [ ] No console warnings

### Firefox

- [ ] All tests pass
- [ ] No console warnings

### Safari

- [ ] All tests pass
- [ ] No console warnings
- [ ] iOS scrolling smooth

### Edge

- [ ] All tests pass
- [ ] No console warnings

---

## 8. Performance Testing

### Load Time

- [ ] **Measure**: Time to Interactive (TTI)
- [ ] **Verify**: TTI < 3 seconds
- [ ] **Measure**: First Contentful Paint (FCP)
- [ ] **Verify**: FCP < 1.5 seconds

### Runtime Performance

- [ ] **Open**: Performance monitor in DevTools
- [ ] **Pan**: Map around
- [ ] **Verify**: Frame rate stays > 30fps
- [ ] **Zoom**: In and out
- [ ] **Verify**: Smooth animation

### Memory Usage

- [ ] **Open**: Memory profiler
- [ ] **Load**: Map with 100+ contractors
- [ ] **Check**: Memory usage < 50MB
- [ ] **Toggle**: Service areas on/off
- [ ] **Verify**: No memory leaks

---

## 9. Network Performance

### API Calls

- [ ] **Open**: Network tab
- [ ] **Load**: Browse map
- [ ] **Verify**: Only necessary API calls made
- [ ] **Check**: Service areas API cached (5 min)
- [ ] **Reload**: Within 5 minutes
- [ ] **Verify**: Service areas loaded from cache

### Asset Loading

- [ ] **Check**: Google Maps API loaded once
- [ ] **Check**: No duplicate resource requests
- [ ] **Check**: Images optimized and compressed

---

## 10. Integration Testing

### Navigation Flow

- [ ] **Start**: Homepage
- [ ] **Click**: "Find Contractors"
- [ ] **Toggle**: Map view
- [ ] **Click**: Contractor marker
- [ ] **Click**: "View Profile"
- [ ] **Verify**: Navigates to profile page
- [ ] **Verify**: Can return to map (back button)

### State Persistence

- [ ] **Toggle**: Map view on browse page
- [ ] **Navigate**: Away and back
- [ ] **Verify**: View preference remembered (if implemented)
- [ ] **Zoom/Pan**: Map
- [ ] **Reload**: Page
- [ ] **Verify**: Map resets to default view

---

## 🚨 Critical Issues Checklist

If any of these fail, **DO NOT** deploy to production:

- [ ] ❌ Map doesn't load (console errors)
- [ ] ❌ Markers at wrong locations
- [ ] ❌ Crashes on mobile
- [ ] ❌ Inaccessible to keyboard users
- [ ] ❌ Screen reader can't navigate
- [ ] ❌ Service areas don't display
- [ ] ❌ Overlap detection doesn't work
- [ ] ❌ Security vulnerability (exposed API keys)

---

## 📊 Test Results Summary

**Date Tested**: _______________  
**Tested By**: _______________  
**Browser(s)**: _______________  
**Device(s)**: _______________

**Total Tests**: 200+  
**Passed**: ______  
**Failed**: ______  
**Skipped**: ______

**Critical Issues**: ______  
**Major Issues**: ______  
**Minor Issues**: ______

**Ready for Production**: ☐ Yes ☐ No

---

## 📝 Notes

(Add any observations, bugs found, or suggestions here)

---

**Completion Status**: ⏳ Pending User Testing  
**Next Step**: Fix any issues found, then proceed to deployment

