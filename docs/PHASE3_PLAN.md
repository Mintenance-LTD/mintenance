# Phase 3: Shared Components Plan

## Overview
Create shared UI components that work seamlessly across web and mobile platforms using design tokens and platform adapters.

## Components to Migrate

### Priority 1: Core Components
1. **Button** - Most used component
   - Variants: primary, secondary, outline, ghost, danger, success
   - Sizes: sm, md, lg, xl
   - States: default, loading, disabled
   - Features: icons, fullWidth, accessibility

2. **Card** - Second most used
   - Variants: default, elevated, outlined
   - Padding: none, sm, md, lg
   - Features: interactive, hover states, accessibility

3. **Input** - Form component
   - Types: text, email, password, number, tel
   - States: default, focused, error, success, disabled
   - Features: label, helper text, icons, validation

4. **Badge** - Status indicator
   - Variants: success, warning, error, info, default
   - Sizes: sm, md, lg

### Priority 2: Secondary Components
5. **LoadingSpinner** - Loading states
6. **EmptyState** - Empty states
7. **ErrorView** - Error states

## Architecture

### Platform Detection
- Use `react-native` imports for mobile
- Use React DOM for web
- Conditional exports based on platform

### Design Tokens Integration
- All components use `@mintenance/design-tokens`
- Web components use `webTokens`
- Mobile components use `mobileTokens`
- Platform adapters handle differences

### Component Structure
```
packages/shared-ui/src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx (shared logic)
│   │   ├── Button.web.tsx (web implementation)
│   │   └── Button.native.tsx (mobile implementation)
│   ├── Card/
│   │   ├── Card.tsx
│   │   ├── Card.web.tsx
│   │   └── Card.native.tsx
│   └── ...
├── hooks/
│   └── usePlatform.ts (platform detection)
└── index.ts (exports)
```

## Implementation Strategy

### Step 1: Create Platform Detection Hook
- Detect if running on web or mobile
- Export appropriate component

### Step 2: Create Button Component
- Shared props interface
- Platform-specific implementations
- Use design tokens for styling

### Step 3: Create Card Component
- Shared props interface
- Platform-specific implementations
- Use design tokens for styling

### Step 4: Create Input Component
- Shared props interface
- Platform-specific implementations
- Use design tokens for styling

### Step 5: Create Badge Component
- Shared props interface
- Platform-specific implementations
- Use design tokens for styling

## Migration Path

1. Create shared components in `packages/shared-ui`
2. Update web app to use shared components
3. Update mobile app to use shared components
4. Remove duplicate components
5. Run visual regression tests

## Success Criteria

- ✅ Components work identically on web and mobile
- ✅ Visual appearance matches design tokens
- ✅ All accessibility features preserved
- ✅ Zero visual changes to web app
- ✅ TypeScript types exported
- ✅ Components are tree-shakeable

