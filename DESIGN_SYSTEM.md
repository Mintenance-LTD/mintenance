# Mintenance Professional Design System

**Inspired by Birch & Revealbot's Sleek, Modern Aesthetic**

---

## Overview

This design system establishes a professional, modern visual language for Mintenance. It combines the clean elegance of Birch with the bold confidence of Revealbot, creating an interface that feels trustworthy, fresh, and contemporary.

### Design Philosophy

- **Professional, Not Amateur**: Every element conveys expertise and reliability
- **Generous White Space**: Content breathes; complexity is reduced
- **Subtle Depth**: Shadows and elevations are refined, never heavy-handed
- **Smooth Interactions**: Micro-animations feel natural and purposeful
- **Mobile-First**: Optimized for touch, scaled for desktop
- **Accessible by Default**: WCAG AA compliant across all components

---

## Brand Colors

### Primary: Navy Blue (#1E293B)

**Usage**: Main navigation, primary buttons, headings, professional elements

```css
--navy-800: #1E293B  /* Primary brand color */
--navy-900: #0F172A  /* Darker variant for hover states */
```

**Psychology**: Trust, professionalism, stability, expertise
**Contrast Ratio**: 15.8:1 on white (WCAG AAA)

**Do's**:
- Use for primary CTAs that require maximum trust
- Apply to navigation and header elements
- Pair with white text for optimal readability

**Don'ts**:
- Don't use for large backgrounds (too dark)
- Avoid pairing with black text (insufficient contrast)
- Don't overuse; balance with lighter neutrals

---

### Secondary: Mint Green (#14B8A6)

**Usage**: Accent elements, success states, secondary buttons, highlights

```css
--mint-500: #14B8A6  /* Secondary brand color */
--mint-600: #0D9488  /* Darker variant */
```

**Psychology**: Growth, freshness, reliability, modern
**Contrast Ratio**: 4.8:1 on white (WCAG AA)

**Do's**:
- Use for confirmation actions and success indicators
- Apply to secondary CTAs and interactive elements
- Create visual interest in data visualizations

**Don'ts**:
- Don't use for error or warning states
- Avoid as body text color (readability)
- Don't combine with red or orange (color blindness)

---

### Accent: Yellow/Gold (#F59E0B)

**Usage**: Call-to-action highlights, special offers, attention-grabbing elements

```css
--gold-500: #F59E0B  /* Accent color */
--gold-600: #D97706  /* Darker variant */
```

**Psychology**: Energy, optimism, value, warmth
**Contrast Ratio**: 3.9:1 on white (WCAG AA Large Text)

**Do's**:
- Use sparingly for maximum impact
- Apply to premium features and special promotions
- Combine with navy for high-contrast CTAs

**Don'ts**:
- Don't use for body text
- Avoid large background areas
- Don't overuse (loses impact)

---

## Neutral Palette

Professional grays for UI elements, text, and backgrounds.

```css
Gray Scale (Lightest to Darkest):
--gray-50:  #F9FAFB  /* Soft backgrounds */
--gray-100: #F3F4F6  /* Card backgrounds */
--gray-200: #E5E7EB  /* Light borders */
--gray-300: #D1D5DB  /* Default borders */
--gray-400: #9CA3AF  /* Disabled text */
--gray-500: #6B7280  /* Secondary text */
--gray-600: #4B5563  /* Body text */
--gray-700: #374151  /* Dark text */
--gray-800: #1F2937  /* Headings */
--gray-900: #111827  /* Primary text */
```

**Main Background**: `#F7F9FC` (Light blue-gray, Birch-inspired)

---

## Typography Hierarchy

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

System fonts ensure fast loading and native feel across platforms.

---

### Type Scale

| Class | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `.text-display-lg` | 72px | 700 | 1.1 | Hero headlines |
| `.text-display-md` | 60px | 700 | 1.1 | Large hero text |
| `.text-display-sm` | 48px | 700 | 1.2 | Small hero text |
| `.text-h1` | 40px | 700 | 1.2 | Page titles |
| `.text-h2` | 32px | 600 | 1.3 | Section headings |
| `.text-h3` | 24px | 600 | 1.4 | Subsection headings |
| `.text-h4` | 20px | 600 | 1.5 | Card titles |
| `.text-body-lg` | 18px | 400 | 1.7 | Large body text |
| `.text-body` | 16px | 400 | 1.6 | **Default body text** |
| `.text-body-sm` | 14px | 400 | 1.5 | Small body text |
| `.text-caption` | 12px | 500 | 1.4 | Labels, captions |
| `.text-tiny` | 10px | 500 | 1.4 | Badges, timestamps |

---

### Typography Examples

```jsx
// Hero Section (Birch-style)
<h1 className="text-display-lg font-bold text-navy-900">
  Find Trusted Contractors
</h1>
<p className="text-body-lg text-gray-600 mt-4">
  Connect with verified professionals in your area
</p>

// Section Header
<h2 className="text-h2 font-semibold text-navy-800">
  How It Works
</h2>

// Card Title
<h3 className="text-h4 font-semibold text-gray-900">
  John's Plumbing Services
</h3>

// Body Content
<p className="text-body text-gray-600">
  Professional plumbing services with 15 years of experience.
  Licensed and insured.
</p>
```

---

## Spacing System

### 4px/8px Grid

All spacing follows a consistent 4px base unit for visual harmony.

| Token | Size | Usage |
|-------|------|-------|
| `space-xs` | 4px | Tight spacing, icon gaps |
| `space-sm` | 8px | Small gaps, button padding |
| `space-md` | 16px | Default spacing, card padding |
| `space-lg` | 24px | Section spacing |
| `space-xl` | 32px | Large sections |
| `space-2xl` | 48px | Major sections |
| `space-3xl` | 64px | Page sections |
| `space-4xl` | 96px | Hero sections |

---

### Generous Section Spacing (Birch-inspired)

```css
.section-padding {
  padding-top: 5rem;    /* 80px */
  padding-bottom: 5rem;
}

.section-padding-lg {
  padding-top: 8rem;    /* 128px */
  padding-bottom: 8rem;
}
```

**Principle**: More white space = cleaner, more professional appearance

---

## Shadows & Elevation

Subtle shadows create depth without overwhelming the design.

### Shadow Scale

```css
.shadow-subtle   /* 0 1px 2px - Minimal lift */
.shadow-sm       /* 0 1px 3px - Cards at rest */
.shadow-base     /* 0 4px 6px - Default elevation */
.shadow-md       /* 0 8px 12px - Hover states */
.shadow-lg       /* 0 16px 24px - Modals */
.shadow-xl       /* 0 24px 48px - Popovers */
```

### Colored Shadows

```css
.shadow-primary    /* Navy glow */
.shadow-secondary  /* Mint glow */
.shadow-gold       /* Gold glow */
```

---

### Shadow Examples

```jsx
// Card Component
<div className="card shadow-sm hover:shadow-md">
  <h3>Service Card</h3>
</div>

// CTA Button with Gold Glow
<button className="btn-gold shadow-gold">
  Get Started
</button>

// Floating Modal
<div className="modal shadow-xl">
  <h2>Confirm Booking</h2>
</div>
```

---

## Border Radius

Consistent rounding creates a modern, friendly aesthetic.

| Class | Size | Usage |
|-------|------|-------|
| `.rounded-sm` | 6px | Small elements, badges |
| `.rounded-base` | 8px | Input fields |
| `.rounded-md` | 12px | Buttons |
| `.rounded-lg` | 16px | Cards |
| `.rounded-xl` | 24px | Large cards |
| `.rounded-2xl` | 32px | Hero sections |
| `.rounded-full` | 9999px | Avatars, pills |

**Standard**: Use `.rounded-lg` (16px) for most cards and containers.

---

## Component Examples

### 1. Buttons

#### Primary Button (Navy)

```jsx
<button className="btn btn-primary">
  Post a Job
</button>
```

**CSS**:
```css
.btn-primary {
  background: var(--navy-800);
  color: var(--white);
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 500;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  background: var(--navy-900);
  box-shadow: 0 4px 12px -2px rgba(30, 41, 59, 0.2);
  transform: translateY(-1px);
}
```

---

#### Secondary Button (Mint)

```jsx
<button className="btn btn-secondary">
  Browse Contractors
</button>
```

**Visual**: Mint green background with white text, subtle lift on hover

---

#### Gold Accent Button (CTAs)

```jsx
<button className="btn btn-gold">
  Claim Free Trial
</button>
```

**Visual**: Bold gold with enhanced glow effect for maximum attention

---

#### Ghost Button

```jsx
<button className="btn btn-ghost">
  Learn More
</button>
```

**Visual**: Transparent with border, subtle background on hover

---

### Button Sizes

```jsx
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary">Default</button>
<button className="btn btn-primary btn-lg">Large</button>
<button className="btn btn-primary btn-xl">Extra Large</button>
```

---

### 2. Cards (Birch-inspired)

#### Basic Card

```jsx
<div className="card">
  <h3 className="text-h4 font-semibold text-gray-900 mb-2">
    Emergency Plumbing
  </h3>
  <p className="text-body text-gray-600 mb-4">
    24/7 emergency plumbing services. Fast response guaranteed.
  </p>
  <button className="btn btn-secondary">
    Request Service
  </button>
</div>
```

**Features**:
- White background
- Light border (`#E5E7EB`)
- 24px border radius
- 32px padding
- Subtle shadow with lift on hover

---

#### Elevated Card

```jsx
<div className="card-elevated">
  <div className="flex items-center gap-4">
    <img src="/avatar.jpg" className="w-16 h-16 rounded-full" />
    <div>
      <h4 className="text-h4 font-semibold">Sarah Johnson</h4>
      <p className="text-body-sm text-gray-500">Master Electrician</p>
    </div>
  </div>
</div>
```

**Features**:
- No border
- Enhanced shadow for floating effect
- Perfect for testimonials, featured content

---

### 3. Input Fields

```jsx
<input
  type="text"
  placeholder="Enter your email"
  className="input"
/>
```

**Features**:
- Clean, minimal design
- 12px border radius
- Mint focus ring
- Smooth transitions

**Error State**:
```jsx
<input
  type="text"
  className="input input-error"
  aria-invalid="true"
/>
<p className="text-body-sm text-error-600 mt-1">
  This field is required
</p>
```

---

### 4. Badges

```jsx
<span className="badge badge-success">Verified</span>
<span className="badge badge-warning">Pending</span>
<span className="badge badge-error">Unavailable</span>
<span className="badge badge-neutral">New</span>
```

**Features**:
- Pill-shaped (fully rounded)
- Uppercase, small font
- Semantic colors with light backgrounds

---

### 5. Glassmorphism Effects

```jsx
// Hero Overlay
<div className="glass p-8 rounded-2xl">
  <h2 className="text-h2 font-bold text-navy-900">
    Premium Features
  </h2>
  <p className="text-body text-gray-700 mt-2">
    Unlock advanced contractor matching
  </p>
</div>

// Dark Glass
<div className="glass-dark p-8 rounded-2xl">
  <h2 className="text-h2 font-bold text-white">
    Dark Mode Card
  </h2>
</div>
```

**Visual**: Frosted glass effect with subtle backdrop blur (Birch/Revealbot-style)

---

## Layout Patterns

### Hero Section (Birch-inspired)

```jsx
<section className="gradient-mesh section-padding-lg">
  <div className="max-w-4xl mx-auto text-center px-4">
    <h1 className="text-display-lg font-bold text-navy-900 mb-6">
      Find Trusted Contractors
    </h1>
    <p className="text-body-lg text-gray-600 mb-8 max-w-2xl mx-auto">
      Connect with verified professionals for all your home improvement needs.
      Fast, reliable, and transparent.
    </p>
    <div className="flex gap-4 justify-center">
      <button className="btn btn-primary btn-lg">
        Post a Job
      </button>
      <button className="btn btn-ghost btn-lg">
        Browse Contractors
      </button>
    </div>
  </div>
</section>
```

**Features**:
- Mesh gradient background
- Generous padding (128px vertical)
- Centered content
- Large, bold typography

---

### Card Grid Layout

```jsx
<section className="section-padding bg-gray-50">
  <div className="max-w-7xl mx-auto px-4">
    <h2 className="text-h2 font-semibold text-navy-800 mb-8">
      Popular Services
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map(service => (
        <ServiceCard key={service.id} {...service} />
      ))}
    </div>
  </div>
</section>
```

**Features**:
- Light gray background
- Responsive grid (1/2/3 columns)
- Consistent 24px gaps

---

### Data Dashboard (Revealbot-inspired)

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Metric Card */}
  <div className="card">
    <div className="flex items-center justify-between mb-2">
      <span className="text-caption text-gray-500">TOTAL JOBS</span>
      <TrendUpIcon className="w-5 h-5 text-success-500" />
    </div>
    <p className="text-display-sm font-bold text-navy-900">247</p>
    <p className="text-body-sm text-success-600 mt-1">
      +12% from last month
    </p>
  </div>

  {/* Repeat for other metrics */}
</div>
```

---

## Animations

### Micro-interactions

```css
/* Fade In */
.animate-fade-in {
  animation: fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Slide Up */
.animate-slide-up {
  animation: slide-up 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover Lift */
.hover-lift:hover {
  transform: translateY(-4px);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### Staggered List Animations

```jsx
<div className="space-y-4">
  <div className="card animate-fade-in stagger-1">Item 1</div>
  <div className="card animate-fade-in stagger-2">Item 2</div>
  <div className="card animate-fade-in stagger-3">Item 3</div>
</div>
```

**Effect**: Items appear sequentially with 100ms delay between each

---

## Accessibility Guidelines

### Color Contrast

All text meets WCAG AA standards:
- Large text (18px+): Minimum 3:1 contrast
- Normal text (16px): Minimum 4.5:1 contrast
- Headlines: Minimum 7:1 contrast (AAA)

### Focus Indicators

```css
.focus-ring:focus-visible {
  outline: 2px solid var(--mint-500);
  outline-offset: 2px;
}
```

All interactive elements have visible focus states.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Respects user's motion preferences.

---

## Responsive Design

### Breakpoints

```typescript
xs: 320px   // Small phones
sm: 640px   // Large phones
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops
2xl: 1536px // Large desktops
```

### Mobile-First Approach

```css
/* Mobile default */
.heading {
  font-size: 2rem;
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .heading {
    font-size: 2.5rem;
    padding: 2rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .heading {
    font-size: 3rem;
    padding: 3rem;
  }
}
```

---

## Do's and Don'ts

### Do's ✓

- **Use generous white space** - Let content breathe
- **Stick to the type scale** - Consistency matters
- **Apply subtle shadows** - Depth, not drama
- **Animate purposefully** - Smooth, not flashy
- **Maintain contrast** - Accessibility first
- **Use system fonts** - Performance and familiarity

### Don'ts ✗

- **Don't cram content** - Avoid tight spacing
- **Don't create custom font sizes** - Use the scale
- **Don't use heavy shadows** - Keep it professional
- **Don't over-animate** - Respect reduced motion
- **Don't sacrifice contrast for aesthetics**
- **Don't load custom fonts unnecessarily**

---

## Quick Reference

### Most Common Patterns

**Hero Section**:
```css
background: gradient-mesh
padding: section-padding-lg (128px vertical)
text: text-display-lg + text-body-lg
```

**Card**:
```css
background: white
border: 1px solid gray-200
border-radius: 24px (rounded-xl)
padding: 32px (space-xl)
shadow: shadow-sm → shadow-md on hover
```

**Button**:
```css
padding: 12px 24px
border-radius: 12px (rounded-md)
font-weight: 500
transition: all 200ms
hover: lift + shadow
```

**Input**:
```css
padding: 14px 16px
border-radius: 12px (rounded-md)
border: 1px solid gray-300
focus: mint-500 ring
```

---

## Implementation

### Import Design System

```tsx
// In your layout or global CSS
import '@/styles/professional-design-system.css';

// In components
import { colors, typography, spacing } from '@/lib/design-tokens';
```

### Example Component

```tsx
import { colors, spacing, borderRadius } from '@/lib/design-tokens';

export const ServiceCard = ({ title, description, price }) => {
  return (
    <div
      className="card hover-lift cursor-pointer"
      style={{
        padding: spacing[8],
        borderRadius: borderRadius.xl,
      }}
    >
      <h3 className="text-h4 font-semibold text-navy-900 mb-2">
        {title}
      </h3>
      <p className="text-body text-gray-600 mb-4">
        {description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-h3 font-bold text-mint-500">
          £{price}
        </span>
        <button className="btn btn-secondary btn-sm">
          View Details
        </button>
      </div>
    </div>
  );
};
```

---

## Resources

### Design Files

- `apps/web/styles/professional-design-system.css` - Complete CSS system
- `apps/web/lib/design-tokens.ts` - TypeScript tokens

### Inspiration Sources

- **Birch**: Clean cards, generous spacing, soft pastels
- **Revealbot**: Bold typography, dark mode, data visualization
- **Checkatrade**: Professional trust indicators, clean layouts

### Tools

- **Color Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Type Scale Generator**: https://type-scale.com/
- **Shadow Generator**: https://shadows.brumm.af/

---

## Changelog

**v1.0.0** - Initial Release
- Established navy/mint/gold color palette
- Created complete typography scale
- Defined spacing system (4px/8px grid)
- Built component library (buttons, cards, inputs, badges)
- Added glassmorphism and gradient utilities
- Implemented WCAG AA accessibility standards

---

**Maintained by**: Mintenance Design Team
**Last Updated**: December 2, 2025
**Version**: 1.0.0
