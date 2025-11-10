# Component Functionality Testing Plan

## Overview
Test all migrated components (Button, Card, Input, Badge) to ensure they function correctly after migration to shared components.

## Testing Approach

### 1. Button Component Testing

#### Test Cases
- [ ] **Rendering**: All variants render correctly
  - Primary variant
  - Secondary variant
  - Outline variant
  - Ghost variant
  - Danger variant
  - Success variant
  - Gradient variants (gradient-primary, gradient-success)
  
- [ ] **Sizes**: All sizes render correctly
  - Small (sm)
  - Medium (md)
  - Large (lg)
  - Extra Large (xl)

- [ ] **States**: All states work correctly
  - Default state
  - Hover state
  - Active/pressed state
  - Focus state (keyboard navigation)
  - Disabled state
  - Loading state

- [ ] **Interactions**: Event handlers work
  - onClick handler fires correctly
  - Keyboard navigation (Enter, Space)
  - Focus management
  - Prevents clicks when disabled
  - Prevents clicks when loading

- [ ] **Icons**: Icon support works
  - Left icon displays correctly
  - Right icon displays correctly
  - Icons hidden during loading state

- [ ] **Accessibility**: Accessibility features work
  - ARIA labels
  - Keyboard navigation
  - Focus indicators visible
  - Screen reader announcements

#### Test Locations
- Login page buttons
- Register page buttons
- Dashboard action buttons
- Form submit buttons
- Navigation buttons

### 2. Input Component Testing

#### Test Cases
- [ ] **Types**: All input types work
  - Text input
  - Email input
  - Password input
  - Number input
  - Search input
  - Tel input
  - URL input

- [ ] **Sizes**: All sizes render correctly
  - Small (sm)
  - Medium (md)
  - Large (lg)

- [ ] **States**: All states work correctly
  - Default state
  - Focused state
  - Error state (with error message)
  - Success state (with success message)
  - Disabled state
  - Read-only state

- [ ] **Features**: Component features work
  - Label displays correctly
  - Helper text displays correctly
  - Error message displays correctly
  - Success message displays correctly
  - Required indicator (*) displays
  - Placeholder text works
  - Value binding works (controlled/uncontrolled)

- [ ] **Icons**: Icon support works
  - Left icon displays correctly
  - Right icon displays correctly
  - Icon positioning correct

- [ ] **Validation**: Form validation works
  - HTML5 validation
  - Custom validation
  - Error state triggers correctly
  - Success state triggers correctly

- [ ] **Accessibility**: Accessibility features work
  - Label association (htmlFor)
  - ARIA attributes
  - Error announcements
  - Keyboard navigation
  - Focus management

#### Test Locations
- Login form inputs
- Register form inputs
- Search inputs
- Filter inputs
- Settings form inputs

### 3. Card Component Testing

#### Test Cases
- [ ] **Variants**: All variants render correctly
  - Default variant
  - Elevated variant
  - Outlined variant
  - Highlighted variant (if supported)
  - Gradient variants (if supported)

- [ ] **Padding**: All padding options work
  - None
  - Small (sm)
  - Medium (md)
  - Large (lg)

- [ ] **Interactions**: Interactive cards work
  - Click handler fires (for interactive cards)
  - Hover effects work
  - Focus management (keyboard navigation)
  - Disabled state prevents interaction

- [ ] **Sub-components**: Sub-components render correctly
  - CardHeader
  - CardTitle
  - CardDescription
  - CardContent
  - CardFooter
  - CardBody (native)

- [ ] **Specialized Variants**: Specialized cards work
  - MetricCard
  - ProgressCard
  - DashboardCard

- [ ] **Accessibility**: Accessibility features work
  - ARIA roles
  - Keyboard navigation
  - Focus indicators

#### Test Locations
- Dashboard cards
- Metric cards
- Job cards
- Profile cards
- Settings cards

### 4. Badge Component Testing

#### Test Cases
- [ ] **Variants**: All variants render correctly
  - Primary
  - Secondary
  - Success
  - Error
  - Warning
  - Info
  - Outline
  - Ghost

- [ ] **Sizes**: All sizes render correctly
  - Small (sm)
  - Medium (md)
  - Large (lg)

- [ ] **Status Mapping**: Status prop maps correctly
  - completed → success
  - in_progress → warning
  - pending → default
  - error states → error
  - etc.

- [ ] **Icons**: Icon support works
  - Left icon displays correctly
  - Right icon displays correctly
  - Dot indicator works (withDot prop)

- [ ] **Sub-components**: Sub-components work
  - StatusBadge
  - CountBadge

- [ ] **Accessibility**: Accessibility features work
  - ARIA labels
  - Screen reader announcements

#### Test Locations
- Job status badges
- User status badges
- Notification badges
- Count badges

## Manual Testing Checklist

### Quick Smoke Tests
- [ ] Navigate to login page - verify Input components render
- [ ] Navigate to homepage - verify Button components render
- [ ] Navigate to dashboard - verify Card components render
- [ ] Check browser console for errors
- [ ] Check browser console for warnings

### Detailed Testing
- [ ] Test each Button variant
- [ ] Test each Input type
- [ ] Test each Card variant
- [ ] Test each Badge variant
- [ ] Test form submissions
- [ ] Test keyboard navigation
- [ ] Test focus management
- [ ] Test disabled states
- [ ] Test loading states

## Automated Testing (Future)

### Unit Tests
- Component rendering tests
- Prop validation tests
- Event handler tests
- State management tests

### Integration Tests
- Form submission tests
- User interaction tests
- Error handling tests

## Test Execution

### Step 1: Quick Verification
1. Start web app: `npm run dev:web`
2. Navigate to key pages
3. Check console for errors
4. Verify components render

### Step 2: Component-by-Component Testing
1. Test Button component
2. Test Input component
3. Test Card component
4. Test Badge component

### Step 3: Integration Testing
1. Test complete forms
2. Test user flows
3. Test error scenarios

## Success Criteria

- ✅ All components render without errors
- ✅ All interactions work correctly
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ Accessibility features work
- ✅ Keyboard navigation works
- ✅ Focus management works
- ✅ States (disabled, loading, error) work correctly

## Issues Tracking

### Critical Issues
- None yet

### Minor Issues
- None yet

### Known Limitations
- None yet

