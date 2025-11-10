# Phase 4: Component Migration Plan

## Overview
Migrate web and mobile apps to use shared components from `@mintenance/shared-ui` package.

## Migration Strategy

### Approach: Gradual Migration with Compatibility Layer
1. Create wrapper components that maintain backward compatibility
2. Migrate high-impact components first (Button, Card)
3. Test visual regression after each component migration
4. Remove old components once migration is complete

### Migration Order
1. **Button** - Most used component (153+ files)
2. **Card** - Second most used (78+ files)
3. **Input** - Form components
4. **Badge** - Status indicators

## Step-by-Step Migration

### Step 1: Button Component Migration

#### Web App
- Current: `apps/web/components/ui/Button.tsx`
- Target: `@mintenance/shared-ui` Button
- Strategy:
  1. Create compatibility wrapper that maps old props to new props
  2. Update imports gradually
  3. Test visual regression
  4. Remove wrapper once all files migrated

#### Compatibility Mapping
- `variant="destructive"` → `variant="danger"`
- `variant="gradient-primary"` → `variant="primary"` (with custom style)
- `variant="gradient-success"` → `variant="success"` (with custom style)
- All other props map directly

### Step 2: Card Component Migration

#### Web App
- Current: `apps/web/components/ui/Card.tsx` and `Card.unified.tsx`
- Target: `@mintenance/shared-ui` Card
- Strategy:
  1. Map existing Card API to shared Card
  2. Update imports
  3. Test visual regression

### Step 3: Input Component Migration

#### Web App
- Current: Various input implementations
- Target: `@mintenance/shared-ui` Input
- Strategy:
  1. Identify all input usages
  2. Migrate to shared Input
  3. Test form functionality

### Step 4: Badge Component Migration

#### Web App
- Current: `apps/web/components/ui/Badge.unified.tsx`
- Target: `@mintenance/shared-ui` Badge
- Strategy:
  1. Map existing Badge API
  2. Update imports
  3. Test visual regression

## Testing Strategy

### Visual Regression Testing
- Run baseline screenshots before migration
- Run tests after each component migration
- Ensure 0% visual differences
- Fix any regressions immediately

### Functional Testing
- Test all Button interactions
- Test all Card interactions
- Test all Input forms
- Test all Badge displays

## Rollback Plan
- Keep old components until migration is 100% complete
- Use feature flags if needed
- Maintain git branches for each migration step

## Success Criteria
- ✅ All components migrated to shared-ui
- ✅ Zero visual changes
- ✅ All functionality works
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Visual regression tests pass

