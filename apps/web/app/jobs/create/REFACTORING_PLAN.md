# Job Creation Page Refactoring Plan

## Current State
- **File:** `apps/web/app/jobs/create/page.tsx`
- **Size:** 1719 lines
- **Status:** Functional but needs refactoring for maintainability

## Refactoring Strategy

### Phase 1: Extract Form Sections (Priority: High)

#### 1.1 Basic Information Section
**New File:** `apps/web/app/jobs/create/components/JobBasicInfoForm.tsx`
- Title input
- Description textarea
- Category select
- Urgency select

#### 1.2 Location Section
**New File:** `apps/web/app/jobs/create/components/JobLocationForm.tsx`
- Location input with autocomplete
- Property selection
- Address search functionality

#### 1.3 Skills & Requirements Section
**New File:** `apps/web/app/jobs/create/components/JobSkillsForm.tsx`
- Skills dropdown
- Selected skills display
- Skill validation

#### 1.4 Budget Section
**New File:** `apps/web/app/jobs/create/components/JobBudgetForm.tsx`
- Budget input
- Cost calculator integration
- Fee breakdown display

#### 1.5 Image Upload Section
**New File:** `apps/web/app/jobs/create/components/JobImageUpload.tsx`
- Image selection
- Preview display
- Upload functionality
- Image removal

### Phase 2: Extract Hooks (Priority: Medium)

#### 2.1 Form State Hook
**New File:** `apps/web/app/jobs/create/hooks/useJobForm.ts`
- Form data state management
- Validation logic
- Form submission

#### 2.2 Location Hook
**New File:** `apps/web/app/jobs/create/hooks/useLocationSearch.ts`
- Address autocomplete
- Location suggestions
- Debounced search

#### 2.3 Image Upload Hook
**New File:** `apps/web/app/jobs/create/hooks/useImageUpload.ts`
- Image preview management
- Upload logic
- Image cleanup

#### 2.4 AI Assessment Hook
**New File:** `apps/web/app/jobs/create/hooks/useAIAssessment.ts`
- Building surveyor integration
- Assessment state
- Error handling

### Phase 3: Extract Utilities (Priority: Low)

#### 3.1 Validation Utilities
**New File:** `apps/web/app/jobs/create/utils/validation.ts`
- Form validation functions
- Error message generation
- Field-specific validators

#### 3.2 Form Submission
**New File:** `apps/web/app/jobs/create/utils/submitJob.ts`
- API call logic
- Error handling
- Success handling

## Target Structure

```
apps/web/app/jobs/create/
├── page.tsx (Main orchestrator - ~200 lines)
├── loading.tsx (Already created)
├── components/
│   ├── JobBasicInfoForm.tsx
│   ├── JobLocationForm.tsx
│   ├── JobSkillsForm.tsx
│   ├── JobBudgetForm.tsx
│   ├── JobImageUpload.tsx
│   ├── VerificationBanner.tsx (extract from page)
│   ├── AIAssessmentSection.tsx (extract from page)
│   └── Existing components (SmartJobAnalysis, etc.)
├── hooks/
│   ├── useJobForm.ts
│   ├── useLocationSearch.ts
│   ├── useImageUpload.ts
│   └── useAIAssessment.ts
└── utils/
    ├── validation.ts
    └── submitJob.ts
```

## Implementation Steps

1. **Create component files** - Extract each section into its own component
2. **Create hook files** - Move state management logic to custom hooks
3. **Update main page** - Use extracted components and hooks
4. **Test thoroughly** - Ensure all functionality still works
5. **Clean up** - Remove unused code

## Benefits

- **Maintainability:** Easier to find and fix bugs
- **Reusability:** Components can be reused elsewhere
- **Testability:** Smaller units are easier to test
- **Readability:** Clear separation of concerns
- **Performance:** Better code splitting opportunities

## Estimated Effort

- **Phase 1:** 4-6 hours
- **Phase 2:** 2-3 hours
- **Phase 3:** 1-2 hours
- **Testing:** 2-3 hours
- **Total:** ~10-14 hours

## Notes

- This refactoring is **non-blocking** for production deployment
- Can be done incrementally
- Each phase can be tested independently
- Consider doing this as part of a larger refactoring sprint

