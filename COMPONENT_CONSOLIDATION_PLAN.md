# Component Consolidation Strategy

## Problem Overview
The Mintenance codebase has excessive component duplication with multiple variants:
- **3+ Landing Page variants**: AirbnbLandingPage, ProductionLandingPage, HeroSectionFixed, etc.
- **4+ Dashboard variants**: HomeownerDashboardAirbnb, HomeownerDashboardProfessional, etc.
- **4+ Layout variants**: ContractorLayout, ModernContractorLayout, ProfessionalContractorLayout, etc.

**Impact**: ~30% code duplication, maintenance nightmare, inconsistent UX, increased bundle size

## Consolidation Strategy

### Phase 1: Unified Component Architecture

#### 1.1 Create Base Components with Composition

```typescript
// Base Dashboard Component
interface DashboardProps {
  variant?: 'default' | 'professional' | 'modern';
  theme?: ThemeConfig;
  features?: FeatureFlags;
  children?: React.ReactNode;
}

const Dashboard: React.FC<DashboardProps> = ({
  variant = 'default',
  theme,
  features,
  children
}) => {
  const themeStyles = useTheme(variant, theme);
  const enabledFeatures = useFeatures(features);

  return (
    <DashboardProvider theme={themeStyles} features={enabledFeatures}>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </DashboardProvider>
  );
};
```

#### 1.2 Theme System for Visual Variations

```typescript
// Theme configuration
const themes = {
  default: {
    colors: { primary: '#3B82F6', secondary: '#10B981' },
    spacing: { compact: false },
    style: 'clean'
  },
  professional: {
    colors: { primary: '#1E40AF', secondary: '#059669' },
    spacing: { compact: true },
    style: 'corporate'
  },
  airbnb: {
    colors: { primary: '#FF5A5F', secondary: '#00A699' },
    spacing: { compact: false },
    style: 'friendly'
  }
};
```

#### 1.3 Feature Flags for Functionality

```typescript
const featureFlags = {
  advancedAnalytics: false,
  aiAssistant: true,
  realTimeUpdates: true,
  socialFeatures: false,
  experimentalUI: false
};
```

### Phase 2: Migration Plan

#### 2.1 Landing Pages Consolidation

**Current Files to Merge:**
- `app/components/landing/AirbnbLandingPage.tsx`
- `app/components/landing/ProductionLandingPage.tsx`
- `app/components/landing/HeroSectionFixed.tsx`
- `app/components/landing/HeroSectionTest.tsx`

**New Unified Structure:**
```
app/components/landing/
  ├── LandingPage.tsx          # Main component with variants
  ├── sections/
  │   ├── HeroSection.tsx       # Unified hero with themes
  │   ├── FeaturesSection.tsx
  │   ├── TestimonialsSection.tsx
  │   └── CTASection.tsx
  ├── themes/
  │   ├── default.ts
  │   ├── professional.ts
  │   └── airbnb.ts
  └── index.ts
```

#### 2.2 Dashboard Consolidation

**Current Files to Merge:**
- `app/dashboard/components/HomeownerDashboardAirbnb.tsx`
- `app/dashboard/components/HomeownerDashboardProfessional.tsx`
- `app/dashboard/components/HomeownerDashboardWithSearch.tsx`
- `app/dashboard/components/DashboardWithAirbnbSearch.tsx`
- `app/contractor/dashboard-enhanced/components/ContractorDashboardAirbnb.tsx`
- `app/contractor/dashboard-enhanced/components/ContractorDashboardProfessional.tsx`

**New Unified Structure:**
```
app/components/dashboard/
  ├── Dashboard.tsx             # Main component
  ├── DashboardProvider.tsx     # Context for theme/features
  ├── widgets/
  │   ├── StatsGrid.tsx
  │   ├── ActivityTimeline.tsx
  │   ├── QuickActions.tsx
  │   └── SearchBar.tsx
  ├── layouts/
  │   ├── DefaultLayout.tsx
  │   ├── SidebarLayout.tsx
  │   └── TopNavLayout.tsx
  └── variants/
      ├── homeowner.ts         # Homeowner-specific config
      └── contractor.ts        # Contractor-specific config
```

#### 2.3 Layout Consolidation

**Current Files to Merge:**
- `app/contractor/components/ContractorLayout.tsx`
- `app/contractor/components/ModernContractorLayout.tsx`
- `app/contractor/components/ProfessionalContractorLayout.tsx`
- `app/contractor/components/ContractorLayoutShell.tsx`
- `app/dashboard/components/HomeownerLayoutShell.tsx`

**New Unified Structure:**
```
app/components/layouts/
  ├── AppLayout.tsx            # Main layout component
  ├── Navigation.tsx           # Unified navigation
  ├── Sidebar.tsx             # Configurable sidebar
  ├── Header.tsx              # Configurable header
  ├── Footer.tsx              # Configurable footer
  └── variants/
      ├── contractor.config.ts
      └── homeowner.config.ts
```

### Phase 3: Implementation Steps

#### Step 1: Create Core Infrastructure (Week 1)
1. Set up theme system with design tokens
2. Implement feature flag system
3. Create composition utilities
4. Build provider components

#### Step 2: Migrate Landing Pages (Week 1-2)
1. Extract common sections
2. Create theme variants
3. Implement A/B testing support
4. Remove duplicate components
5. Update all imports

#### Step 3: Migrate Dashboards (Week 2-3)
1. Extract common widgets
2. Create role-based configurations
3. Implement layout system
4. Test all variants
5. Remove old components

#### Step 4: Migrate Layouts (Week 3-4)
1. Create unified navigation system
2. Implement responsive layouts
3. Add accessibility features
4. Test across devices
5. Clean up old code

### Phase 4: Validation & Testing

#### Testing Strategy
1. **Visual Regression Tests**: Ensure no visual changes
2. **Unit Tests**: Test component composition
3. **Integration Tests**: Test theme switching
4. **E2E Tests**: Test user flows
5. **Performance Tests**: Verify bundle size reduction

#### Success Metrics
- [ ] 30% reduction in component files
- [ ] 25% reduction in bundle size
- [ ] 100% feature parity
- [ ] No visual regressions
- [ ] Improved load times

### Phase 5: Benefits & Impact

#### Expected Benefits
1. **Code Reduction**: ~30% less code to maintain
2. **Bundle Size**: 50-100KB reduction per page
3. **Development Speed**: 2x faster feature development
4. **Consistency**: Single source of truth for UI
5. **Maintainability**: Easier updates and bug fixes

#### Performance Improvements
- **Before**: Multiple component bundles loaded
- **After**: Single optimized component with lazy-loaded variants
- **Result**: 20-30% faster initial load

### Migration Checklist

#### Pre-Migration
- [ ] Audit all component variants
- [ ] Document feature differences
- [ ] Create migration guide
- [ ] Set up feature flags
- [ ] Configure A/B testing

#### During Migration
- [ ] Create unified components
- [ ] Migrate section by section
- [ ] Test each migration
- [ ] Update documentation
- [ ] Monitor performance

#### Post-Migration
- [ ] Remove old components
- [ ] Update all imports
- [ ] Clean up unused styles
- [ ] Update storybook
- [ ] Train team on new structure

### Example: Unified Dashboard Implementation

```typescript
// app/components/dashboard/Dashboard.tsx
import React from 'react';
import { DashboardProvider } from './DashboardProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { homeownerConfig, contractorConfig } from './variants';

interface DashboardProps {
  variant?: 'default' | 'professional' | 'airbnb';
  customTheme?: Partial<Theme>;
  featureOverrides?: Partial<FeatureFlags>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  variant = 'default',
  customTheme,
  featureOverrides
}) => {
  const role = useUserRole();
  const config = role === 'contractor' ? contractorConfig : homeownerConfig;

  return (
    <DashboardProvider
      variant={variant}
      config={config}
      customTheme={customTheme}
      featureOverrides={featureOverrides}
    >
      <DashboardLayout>
        <StatsGrid />
        <ActivityTimeline />
        <QuickActions />
      </DashboardLayout>
    </DashboardProvider>
  );
};

// Usage examples:
// <Dashboard />                              // Default theme
// <Dashboard variant="professional" />       // Professional theme
// <Dashboard variant="airbnb" />            // Airbnb-style theme
// <Dashboard customTheme={{ primary: '#custom' }} />  // Custom theme
```

### Risk Mitigation

1. **Feature Parity Risk**: Document all features before migration
2. **Visual Regression Risk**: Use automated visual testing
3. **Performance Risk**: Monitor bundle sizes continuously
4. **User Impact Risk**: Use feature flags for gradual rollout
5. **Development Risk**: Maintain old components until migration complete

### Timeline

- **Week 1**: Infrastructure setup
- **Week 2**: Landing page migration
- **Week 3**: Dashboard migration
- **Week 4**: Layout migration
- **Week 5**: Testing and cleanup
- **Week 6**: Documentation and training

### Success Criteria

1. ✅ All variants consolidated
2. ✅ Bundle size reduced by 25%+
3. ✅ No visual regressions
4. ✅ All tests passing
5. ✅ Team trained on new structure
6. ✅ Documentation updated

## Next Steps

1. Review and approve plan
2. Set up feature flag infrastructure
3. Begin with landing page consolidation
4. Monitor metrics throughout migration
5. Gather team feedback continuously