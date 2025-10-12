# Landing Page Refactoring Plan

**File**: `apps/web/app/page.tsx`  
**Current Size**: 596 lines  
**Target**: <500 lines per file (split into 7-8 components)  
**Status**: ⚠️ IN PROGRESS - Pattern established, completion needed

---

## ✅ Completed Components

1. **LandingNavigation.tsx** - 74 lines ✅
   - Location: `apps/web/app/components/landing/LandingNavigation.tsx`
   - Contains: Desktop navigation bar with logo and auth buttons

2. **StatsSection.tsx** - 32 lines ✅  
   - Location: `apps/web/app/components/landing/StatsSection.tsx`
   - Contains: Statistics (10,000+ contractors, 50,000+ jobs, 4.8★ rating)

---

## 📋 Remaining Components to Create

### 3. HeroSection.tsx (~200 lines)
**Extract from**: Lines 62-200 of `page.tsx`

```typescript
'use client';
import Link from 'next/link';

/**
 * Hero section with headline, CTA buttons, and phone mockup
 */
export function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0F172A] to-[#1e293b] relative overflow-hidden" role="banner">
      {/* Extract lines 65-200 */}
      {/* Hero content, phone mockup, floating cards */}
    </section>
  );
}
```

---

### 4. HowItWorksSection.tsx (~150 lines)
**Extract from**: Lines 222-372 of `page.tsx`

```typescript
'use client';
import Image from 'next/image';

/**
 * "How It Works" section with 3-step process
 */
export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-gray-50 relative overflow-hidden">
      {/* Extract lines 224-372 */}
      {/* 3 steps with mini phone mockups */}
    </section>
  );
}
```

---

### 5. ServicesSection.tsx (~40 lines)
**Extract from**: Lines 354-393 of `page.tsx`

```typescript
'use client';
import Image from 'next/image';

/**
 * Popular services grid (10 service categories)
 */
export function ServicesSection() {
  const services = [
    { name: 'Plumbing', color: '#3B82F6', icon: '🔧' },
    { name: 'Electrical', color: '#F59E0B', icon: '⚡' },
    // ... 8 more services
  ];

  return (
    <section id="services" className="py-20 bg-white">
      {/* Grid of service categories */}
    </section>
  );
}
```

---

### 6. FeaturesSection.tsx (~50 lines)
**Extract from**: Lines 395-440 of `page.tsx`

```typescript
'use client';
import Image from 'next/image';

/**
 * AI-powered features section (3 features)
 */
export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gradient-to-br from-[#0F172A] to-[#1e293b]">
      {/* 3 AI feature cards */}
    </section>
  );
}
```

---

### 7. CTASection.tsx (~30 lines)
**Extract from**: Lines 442-469 of `page.tsx`

```typescript
'use client';
import Link from 'next/link';

/**
 * Call-to-action section with role selection buttons
 */
export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-[#10B981] to-[#059669]">
      {/* CTA content */}
    </section>
  );
}
```

---

### 8. FooterSection.tsx (~140 lines)
**Extract from**: Lines 474-614 of `page.tsx`

```typescript
'use client';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Footer with links, company info, and legal details
 */
export function FooterSection() {
  return (
    <footer id="footer" className="bg-[#0F172A] text-white" role="contentinfo">
      {/* Footer content */}
    </footer>
  );
}
```

---

## 🔄 Updated page.tsx (~40 lines)

After refactoring, the main `page.tsx` becomes a thin orchestrator:

```typescript
'use client';

import { SkipLink } from '../components/ui/SkipLink';
import { MobileNavigation } from '../components/ui/MobileNavigation';
import { LandingNavigation } from './components/landing/LandingNavigation';
import { HeroSection } from './components/landing/HeroSection';
import { StatsSection } from './components/landing/StatsSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { ServicesSection } from './components/landing/ServicesSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { CTASection } from './components/landing/CTASection';
import { FooterSection } from './components/landing/FooterSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Accessibility */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>
      <SkipLink href="#footer">Skip to footer</SkipLink>

      {/* Navigation */}
      <LandingNavigation />
      <MobileNavigation
        items={[
          { label: 'How It Works', href: '#how-it-works' },
          { label: 'Services', href: '#services' },
          { label: 'Features', href: '#features' },
        ]}
        className="md:hidden"
      />

      {/* Main Content */}
      <main id="main-content">
        <HeroSection />
        <StatsSection />
        <HowItWorksSection />
        <ServicesSection />
        <FeaturesSection />
        <CTASection />
      </main>

      {/* Footer */}
      <FooterSection />
    </div>
  );
}
```

---

## 📊 Size Reduction Summary

| File | Before | After | Status |
|------|--------|-------|--------|
| page.tsx | 596 lines | ~40 lines | ⚠️ Pending |
| LandingNavigation.tsx | - | 74 lines | ✅ Done |
| HeroSection.tsx | - | ~200 lines | 📝 To Create |
| StatsSection.tsx | - | 32 lines | ✅ Done |
| HowItWorksSection.tsx | - | ~150 lines | 📝 To Create |
| ServicesSection.tsx | - | ~40 lines | 📝 To Create |
| FeaturesSection.tsx | - | ~50 lines | 📝 To Create |
| CTASection.tsx | - | ~30 lines | 📝 To Create |
| FooterSection.tsx | - | ~140 lines | 📝 To Create |
| **TOTAL** | **596 lines** | **~716 lines (distributed)** | **93% reduction in main file** |

---

## ✅ Benefits of This Refactoring

1. **Single Responsibility**: Each component has ONE clear purpose
2. **Reusability**: Components can be reused or rearranged
3. **Testability**: Each section can be tested independently
4. **Maintainability**: Easy to find and update specific sections
5. **Code Quality**: Adheres to <500 line file size rule
6. **Performance**: Better code splitting and lazy loading potential

---

## 🚀 Next Steps

1. ✅ Create remaining 6 components (HeroSection through FooterSection)
2. ✅ Update main `page.tsx` to use the new components
3. ✅ Test that all functionality works correctly
4. ✅ Verify responsive design on all screen sizes
5. ✅ Run linter and fix any issues

---

## 📝 Pattern to Follow

For each component:
1. Create file in `apps/web/app/components/landing/`
2. Add JSDoc comment explaining purpose
3. Extract relevant JSX from `page.tsx`
4. Ensure all imports are included
5. Keep file under 200 lines
6. Mark as `'use client'` if using interactivity

---

**Estimated Time**: 30-45 minutes to complete all components  
**Priority**: Medium (works correctly but violates file size rule)  
**Risk**: Low (pure UI refactoring, no logic changes)

