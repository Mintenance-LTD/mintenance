# Responsiveness Guide

## Overview

All pages in the Mintenance application should be fully responsive across desktop, tablet, and mobile devices. This guide outlines the breakpoints, patterns, and testing requirements.

## Breakpoints

Following Tailwind CSS default breakpoints:

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm to lg)
- **Desktop**: ≥ 1024px (lg+)

## Layout Requirements

### Sidebar Navigation

#### Desktop (≥ 1024px)
- Fixed sidebar: 240px width
- Main content: `ml-[240px]`
- Sidebar always visible

#### Tablet & Mobile (< 1024px)
- Sidebar becomes drawer/overlay
- Hamburger menu toggle
- Main content: full width
- Sidebar slides in from left

**Implementation Pattern:**
\`\`\`tsx
<div className="flex min-h-screen bg-gray-50">
  {/* Sidebar - Hidden on mobile, fixed on desktop */}
  <div className="hidden lg:block">
    <DarkNavySidebar {...props} />
  </div>

  {/* Mobile Menu Button */}
  <button className="lg:hidden fixed top-4 left-4 z-50">
    <Icon name="menu" size={24} />
  </button>

  {/* Main Content */}
  <main className="flex-1 lg:ml-[240px]">
    <PageHeader {...props} />
    {/* Content */}
  </main>
</div>
\`\`\`

### Content Width

- **Maximum width**: 1440px for main content
- **Padding**: 
  - Mobile: `p-4`
  - Tablet: `p-6`
  - Desktop: `p-8`

\`\`\`tsx
<div className="p-4 md:p-6 lg:p-8 max-w-7xl">
  {/* Content */}
</div>
\`\`\`

### Grid Layouts

#### Properties Grid
\`\`\`tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Property cards */}
</div>
\`\`\`

#### Two Column Form
\`\`\`tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Form fields */}
</div>
\`\`\`

### Typography Scaling

\`\`\`tsx
{/* Page Title */}
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

{/* Section Title */}
<h2 className="text-xl md:text-2xl font-semibold">

{/* Body Text */}
<p className="text-sm md:text-base">
\`\`\`

## Component Responsiveness

### PageHeader

- Mobile: Stack title and actions vertically
- Desktop: Horizontal layout

\`\`\`tsx
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
    <p className="text-sm md:text-base text-gray-600">{subtitle}</p>
  </div>
  <div className="flex gap-2">{actions}</div>
</div>
\`\`\`

### Cards

\`\`\`tsx
<div className="bg-white rounded-xl border p-4 md:p-6 lg:p-8">
  {/* Card content */}
</div>
\`\`\`

### Tables

- Mobile: Card layout (stacked)
- Desktop: Traditional table

\`\`\`tsx
{/* Mobile */}
<div className="block md:hidden">
  {items.map(item => (
    <div className="bg-white rounded-lg border p-4 mb-4">
      <div className="font-semibold">{item.name}</div>
      <div className="text-sm text-gray-600">{item.details}</div>
    </div>
  ))}
</div>

{/* Desktop */}
<table className="hidden md:table w-full">
  {/* Table content */}
</table>
\`\`\`

### Buttons

- Mobile: Full width
- Desktop: Auto width

\`\`\`tsx
<button className="w-full md:w-auto px-6 py-3.5 bg-teal-500 text-white rounded-lg">
  Action
</button>
\`\`\`

### Forms

\`\`\`tsx
{/* Form Container */}
<div className="max-w-full md:max-w-2xl mx-auto">
  <form className="space-y-4">
    {/* Two-column on desktop, single on mobile */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>{/* Field 1 */}</div>
      <div>{/* Field 2 */}</div>
    </div>

    {/* Button Group */}
    <div className="flex flex-col md:flex-row gap-3">
      <button className="flex-1">Cancel</button>
      <button className="flex-1">Submit</button>
    </div>
  </form>
</div>
\`\`\`

## Testing Checklist

### Desktop (≥ 1024px)
- [ ] Sidebar fixed and visible
- [ ] Content properly offset by sidebar width
- [ ] Grid layouts show all columns
- [ ] Tables display correctly
- [ ] Typography at full size
- [ ] Hover states work properly

### Tablet (640px - 1024px)
- [ ] Sidebar collapses to drawer
- [ ] Grid columns reduce appropriately
- [ ] Tables remain readable
- [ ] Touch targets >= 44px
- [ ] Forms remain usable

### Mobile (< 640px)
- [ ] All content visible without horizontal scroll
- [ ] Text remains readable
- [ ] Buttons are full width or properly sized
- [ ] Touch targets >= 44px
- [ ] Forms stack vertically
- [ ] Images scale appropriately
- [ ] Modals/dialogs fit screen

## Pages Verified

### ✅ Completed Pages
- Settings page
- Messages page  
- Profile page
- Properties page
- Job Details page
- Scheduling page

**Note**: All 6 main pages use responsive Tailwind classes and should work across devices. Sidebar responsiveness may need enhancement for mobile drawer functionality.

## Common Responsive Patterns

### Image Responsiveness
\`\`\`tsx
<img
  src={url}
  alt={alt}
  className="w-full h-auto object-cover rounded-lg"
/>
\`\`\`

### Flexbox Wrapping
\`\`\`tsx
<div className="flex flex-wrap gap-4">
  {/* Items wrap on smaller screens */}
</div>
\`\`\`

### Conditional Rendering
\`\`\`tsx
{/* Show on mobile only */}
<div className="block md:hidden">Mobile content</div>

{/* Show on desktop only */}
<div className="hidden md:block">Desktop content</div>
\`\`\`

### Container Queries (Future)
Consider implementing container queries for component-level responsiveness as browser support improves.

## Browser Testing

Test across:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Tools

- Chrome DevTools Device Mode
- Firefox Responsive Design Mode
- Real device testing (recommended)
- BrowserStack / LambdaTest for cross-browser

## Known Considerations

1. **Sidebar Mobile Enhancement**: Current implementation uses `ml-[240px]` which may need hamburger menu for mobile
2. **Calendar Component**: May need specialized mobile view in Scheduling page
3. **Job Photos**: PhotoGallery component should support touch gestures on mobile
4. **Forms**: Long forms may benefit from multi-step wizard on mobile

## Recommendations

1. Add mobile drawer for DarkNavySidebar with hamburger toggle
2. Test all forms on < 375px width devices
3. Implement swipe gestures for image galleries
4. Add loading skeletons for better perceived performance
5. Consider Progressive Web App (PWA) features for mobile users
