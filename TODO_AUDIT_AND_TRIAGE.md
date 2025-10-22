# TODO/FIXME Audit and Triage Report

**Generated:** 2025-10-22
**Total Items Found:** 29
**Status:** Ready for GitHub Issue Creation

---

## Executive Summary

This document catalogs all TODO and FIXME comments found in the Mintenance codebase and provides triaged categorization for creating GitHub issues. Items are organized by priority, category, and estimated effort.

---

## Priority Classification

### P0 - Critical (0 items)
*No critical TODOs requiring immediate attention*

### P1 - High Priority (8 items)
**Must be completed before production launch**

1. **Error Tracking Integration** (2 items)
2. **API Endpoint Completion** (4 items)
3. **Storage Service Integration** (2 items)

### P2 - Medium Priority (12 items)
**Should be completed within next 2 sprints**

1. **Feature Completions** (7 items)
2. **Backend Integrations** (5 items)

### P3 - Low Priority (9 items)
**Nice to have improvements**

1. **UI Enhancements** (4 items)
2. **Code Improvements** (3 items)
3. **Test Coverage** (2 items)

---

## Detailed Breakdown by Category

### Category 1: Error Tracking & Monitoring (P1)

#### 1.1 Mobile Error Boundary - Sentry Integration
**File:** `apps/mobile/src/components/ErrorBoundary.tsx:56`
**TODO:** `// TODO: Integrate with Sentry or similar service`
**Priority:** P1
**Estimated Effort:** 4-6 hours
**Dependencies:** Sentry account setup, React Native SDK installation

**Description:**
Currently, the mobile app's ErrorBoundary component logs errors locally but doesn't send them to a monitoring service. This needs Sentry integration for production error tracking.

**GitHub Issue Template:**
```markdown
**Title:** Integrate Sentry Error Tracking in Mobile App

**Labels:** P1, enhancement, mobile, monitoring

**Description:**
Implement Sentry integration in the mobile app's ErrorBoundary component to capture and report runtime errors in production.

**Current State:**
- ErrorBoundary catches errors but only logs them locally
- No production error monitoring

**Requirements:**
- [ ] Install and configure @sentry/react-native
- [ ] Integrate Sentry DSN from environment variables
- [ ] Update ErrorBoundary.tsx to send errors to Sentry
- [ ] Add source map upload to CI/CD pipeline
- [ ] Test error reporting in staging environment
- [ ] Document Sentry dashboard access for team

**File Location:**
apps/mobile/src/components/ErrorBoundary.tsx:56

**Estimated Effort:** 4-6 hours
```

#### 1.2 Web Error Boundary - Sentry Integration
**File:** `apps/web/components/ui/ErrorBoundary.tsx:44`
**TODO:** `// TODO: Send to error tracking service (Sentry, LogRocket, etc.)`
**Priority:** P1
**Estimated Effort:** 2-4 hours
**Dependencies:** Sentry account setup, web SDK installation

**GitHub Issue Template:**
```markdown
**Title:** Integrate Error Tracking in Web App ErrorBoundary

**Labels:** P1, enhancement, web, monitoring

**Description:**
Add error tracking service (Sentry or LogRocket) to web app ErrorBoundary component.

**Current State:**
- Web ErrorBoundary lacks production error reporting

**Requirements:**
- [ ] Install @sentry/nextjs or @sentry/react
- [ ] Configure Sentry DSN in environment variables
- [ ] Update ErrorBoundary to report errors
- [ ] Add source map support
- [ ] Test error reporting

**File Location:**
apps/web/components/ui/ErrorBoundary.tsx:44

**Estimated Effort:** 2-4 hours
```

#### 1.3 Logger Monitoring Integration
**File:** `packages/shared/src/logger/index.ts:145`
**TODO:** `// TODO: Integrate with monitoring service`
**Priority:** P2
**Estimated Effort:** 3-5 hours

**GitHub Issue Template:**
```markdown
**Title:** Integrate Centralized Logging with Monitoring Service

**Labels:** P2, enhancement, infrastructure, monitoring

**Description:**
Connect the shared logger package to a centralized monitoring service (DataDog, LogRocket, or similar).

**Requirements:**
- [ ] Choose monitoring service (DataDog, New Relic, etc.)
- [ ] Implement transport layer for log shipping
- [ ] Configure log levels and filtering
- [ ] Add structured logging support
- [ ] Set up alerting rules

**File Location:**
packages/shared/src/logger/index.ts:145

**Estimated Effort:** 3-5 hours
```

---

### Category 2: API Endpoints (P1)

#### 2.1 Contractor Verification API
**Files:**
- `apps/mobile/src/screens/contractor-verification/ContractorVerificationScreen.tsx:53`
- `apps/mobile/src/screens/contractor-verification/ContractorVerificationScreen.tsx:75`

**TODOs:**
- Line 53: `// TODO: Check contractor verification status from API`
- Line 75: `// TODO: Call verification API`

**Priority:** P1
**Estimated Effort:** 6-8 hours
**Dependencies:** Backend API endpoint creation

**GitHub Issue Template:**
```markdown
**Title:** Implement Contractor Verification API Endpoints

**Labels:** P1, backend, api, contractor

**Description:**
Create and integrate contractor verification API endpoints for checking status and submitting verification requests.

**Current State:**
- Screen UI is complete but uses mock/hardcoded data
- No backend API endpoints exist

**Requirements:**
Backend:
- [ ] Create POST /api/contractor/verification/submit endpoint
- [ ] Create GET /api/contractor/verification/status endpoint
- [ ] Add verification document upload support
- [ ] Implement verification workflow logic
- [ ] Add proper validation and error handling

Frontend:
- [ ] Replace mock data with API calls
- [ ] Handle loading states
- [ ] Implement error handling with user feedback
- [ ] Add retry logic for failed requests

**File Locations:**
- apps/mobile/src/screens/contractor-verification/ContractorVerificationScreen.tsx:53
- apps/mobile/src/screens/contractor-verification/ContractorVerificationScreen.tsx:75

**Estimated Effort:** 6-8 hours (3-4 backend, 3-4 frontend)
```

#### 2.2 Invoice Management APIs
**Files:**
- `apps/mobile/src/screens/InvoiceManagementScreen.tsx:47`
- `apps/mobile/src/screens/InvoiceManagementScreen.tsx:72`
- `apps/mobile/src/screens/InvoiceManagementScreen.tsx:93`

**TODOs:**
- Line 47: `// TODO: implement invoice listing API in contractorBusinessSuite`
- Line 72: `// TODO: implement reminder API; placeholder success`
- Line 93: `// TODO: implement mark-paid API; placeholder success`

**Priority:** P1
**Estimated Effort:** 8-10 hours

**GitHub Issue Template:**
```markdown
**Title:** Implement Invoice Management API Endpoints

**Labels:** P1, backend, api, invoicing, contractor

**Description:**
Complete invoice management API integration for contractors including listing, reminders, and payment status updates.

**Current State:**
- Invoice UI is functional but uses placeholder data
- No backend API endpoints exist

**Requirements:**
Backend:
- [ ] Create GET /api/contractor/invoices endpoint (list with filters)
- [ ] Create POST /api/contractor/invoices/:id/remind endpoint
- [ ] Create PUT /api/contractor/invoices/:id/mark-paid endpoint
- [ ] Add pagination support for invoice listing
- [ ] Implement invoice reminder email service
- [ ] Add proper validation and permissions

Frontend:
- [ ] Replace placeholder success with API calls
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Handle pagination
- [ ] Add optimistic UI updates

**File Locations:**
- apps/mobile/src/screens/InvoiceManagementScreen.tsx:47
- apps/mobile/src/screens/InvoiceManagementScreen.tsx:72
- apps/mobile/src/screens/InvoiceManagementScreen.tsx:93

**Estimated Effort:** 8-10 hours (5-6 backend, 3-4 frontend)
```

#### 2.3 Discover Action API
**Files:**
- `apps/web/app/discover/components/DiscoverClient.tsx:42`
- `apps/web/app/discover/components/DiscoverClient.refactored.tsx:32`

**TODOs:**
- Both files: `// TODO: Send action to API`

**Priority:** P2
**Estimated Effort:** 3-4 hours

**GitHub Issue Template:**
```markdown
**Title:** Implement Discover Action API Endpoint

**Labels:** P2, backend, api, web, discover

**Description:**
Create API endpoint to handle discover page actions (likes, saves, shares, etc.).

**Current State:**
- UI interaction handlers exist but don't persist actions
- Same TODO exists in both original and refactored files

**Requirements:**
Backend:
- [ ] Create POST /api/discover/actions endpoint
- [ ] Support action types: like, save, share, report
- [ ] Add proper authorization checks
- [ ] Implement action analytics tracking

Frontend:
- [ ] Integrate API calls in both DiscoverClient files
- [ ] Add optimistic updates
- [ ] Implement error handling
- [ ] Add action feedback animations

**File Locations:**
- apps/web/app/discover/components/DiscoverClient.tsx:42
- apps/web/app/discover/components/DiscoverClient.refactored.tsx:32

**Estimated Effort:** 3-4 hours (2 backend, 1-2 frontend)
```

#### 2.4 Notification Settings Backend
**File:** `apps/mobile/src/screens/NotificationSettingsScreen.tsx:52`
**TODO:** `// TODO: Save settings to backend`
**Priority:** P2
**Estimated Effort:** 3-4 hours

**GitHub Issue Template:**
```markdown
**Title:** Implement Notification Settings API Endpoint

**Labels:** P2, backend, api, mobile, notifications

**Description:**
Create backend endpoint to persist user notification preferences.

**Current State:**
- Settings UI is functional but changes are not persisted
- Settings reset on app restart

**Requirements:**
Backend:
- [ ] Create PUT /api/user/notification-settings endpoint
- [ ] Store settings in user profile
- [ ] Support granular notification preferences
- [ ] Add validation for preference structure

Frontend:
- [ ] Integrate API call on settings change
- [ ] Add loading indicators during save
- [ ] Implement error handling
- [ ] Show success confirmation

**File Location:**
apps/mobile/src/screens/NotificationSettingsScreen.tsx:52

**Estimated Effort:** 3-4 hours (2 backend, 1-2 frontend)
```

---

### Category 3: Storage & File Upload (P1)

#### 3.1 Service Request Photo Upload
**File:** `apps/mobile/src/screens/ServiceRequestScreen.tsx:280`
**TODO:** `photos, // TODO: Upload to storage service`
**Priority:** P1
**Estimated Effort:** 4-6 hours

**GitHub Issue Template:**
```markdown
**Title:** Implement Photo Upload for Service Requests

**Labels:** P1, enhancement, mobile, storage, supabase

**Description:**
Implement Supabase storage integration for uploading service request photos.

**Current State:**
- Photos are captured but not uploaded to storage
- Service requests submitted without photo references

**Requirements:**
Backend/Storage:
- [ ] Create Supabase storage bucket for service-request-photos
- [ ] Configure bucket policies (private, authenticated access)
- [ ] Set up CDN/image optimization if needed

Frontend:
- [ ] Implement photo upload to Supabase storage
- [ ] Generate and store photo URLs in service request
- [ ] Add upload progress indicators
- [ ] Implement retry logic for failed uploads
- [ ] Add image compression before upload
- [ ] Handle multiple photo uploads

**File Location:**
apps/mobile/src/screens/ServiceRequestScreen.tsx:280

**Estimated Effort:** 4-6 hours
```

#### 3.2 Contractor File Upload
**File:** `apps/mobile/src/services/ContractorService.ts:626`
**TODO:** `// TODO: Implement actual file upload to Supabase storage`
**Priority:** P1
**Estimated Effort:** 3-5 hours

**GitHub Issue Template:**
```markdown
**Title:** Implement Contractor File Upload to Supabase Storage

**Labels:** P1, enhancement, mobile, storage, contractor

**Description:**
Complete Supabase storage integration for contractor document uploads (licenses, insurance, portfolio images).

**Current State:**
- File upload functionality is stubbed
- Documents not persisting to storage

**Requirements:**
- [ ] Create Supabase storage bucket for contractor-documents
- [ ] Configure bucket policies and RLS
- [ ] Implement upload function in ContractorService
- [ ] Add file type validation
- [ ] Implement upload progress tracking
- [ ] Add file size limits and compression
- [ ] Generate secure URLs for stored files

**File Location:**
apps/mobile/src/services/ContractorService.ts:626

**Estimated Effort:** 3-5 hours
```

---

### Category 4: Security & Infrastructure (P1)

#### 4.1 Secure Credential Management
**Files:**
- `apps/mobile/src/config/environment.secure.ts:87`
- `apps/mobile/src/config/environment.secure.ts:99`

**TODOs:**
- Line 87: `// TODO: Implement server endpoint /api/credentials/google-maps`
- Line 99: `// TODO: Implement server endpoint /api/credentials/:service`

**Priority:** P1
**Estimated Effort:** 5-7 hours

**GitHub Issue Template:**
```markdown
**Title:** Implement Secure Credential Delivery API Endpoints

**Labels:** P1, security, backend, api, infrastructure

**Description:**
Create secure backend endpoints to deliver API credentials (Google Maps, etc.) to mobile clients without exposing secrets in the app bundle.

**Current State:**
- Mobile app currently embeds API keys (security risk)
- No secure credential delivery mechanism

**Requirements:**
Backend:
- [ ] Create GET /api/credentials/google-maps endpoint
- [ ] Create GET /api/credentials/:service endpoint (generic)
- [ ] Implement authentication/authorization checks
- [ ] Add rate limiting to prevent abuse
- [ ] Store credentials securely (environment variables/secrets manager)
- [ ] Add credential rotation support
- [ ] Log credential access for auditing

Frontend:
- [ ] Update environment.secure.ts to fetch credentials
- [ ] Implement secure credential caching
- [ ] Add credential refresh logic
- [ ] Handle credential fetch failures gracefully

**Security Considerations:**
- Credentials should only be delivered to authenticated users
- Implement per-device rate limiting
- Consider using JWT tokens with short expiration
- Add monitoring for suspicious credential access patterns

**File Locations:**
- apps/mobile/src/config/environment.secure.ts:87
- apps/mobile/src/config/environment.secure.ts:99

**Estimated Effort:** 5-7 hours (4-5 backend, 1-2 frontend)
```

#### 4.2 Rate Limiting Implementation
**File:** `apps/mobile/src/middleware/InputValidationMiddleware.ts:389`
**TODO:** `// TODO: Implement proper rate limiting with persistent storage`
**Priority:** P2
**Estimated Effort:** 4-6 hours

**GitHub Issue Template:**
```markdown
**Title:** Implement Persistent Rate Limiting Middleware

**Labels:** P2, security, backend, infrastructure

**Description:**
Replace in-memory rate limiting with persistent storage-backed rate limiting (Redis or similar).

**Current State:**
- Rate limiting is in-memory only
- Limits reset on server restart
- No protection against distributed attacks

**Requirements:**
- [ ] Set up Redis instance (or alternative)
- [ ] Implement Redis-backed rate limiter
- [ ] Configure per-endpoint rate limits
- [ ] Add per-user and per-IP rate limiting
- [ ] Implement sliding window algorithm
- [ ] Add rate limit headers in responses
- [ ] Create rate limit bypass for admins
- [ ] Add monitoring and alerting

**File Location:**
apps/mobile/src/middleware/InputValidationMiddleware.ts:389

**Estimated Effort:** 4-6 hours
```

---

### Category 5: Feature Completions (P2)

#### 5.1 Message Input Enhancements
**Files:**
- `apps/web/components/messaging/MessageInput.tsx:51`
- `apps/web/components/messaging/MessageInput.tsx:56`

**TODOs:**
- Line 51: `// TODO: implement file upload`
- Line 56: `// TODO: implement emoji picker`

**Priority:** P2
**Estimated Effort:** 6-8 hours (3-4 hours each)

**GitHub Issue Template:**
```markdown
**Title:** Add File Upload and Emoji Picker to Message Input

**Labels:** P2, enhancement, web, messaging, UX

**Description:**
Enhance message input component with file upload and emoji picker functionality.

**Current State:**
- Basic text messaging works
- No file attachments support
- No emoji picker

**Requirements:**
File Upload:
- [ ] Add file upload button to MessageInput
- [ ] Implement file selection dialog
- [ ] Support multiple file types (images, PDFs, docs)
- [ ] Add file size validation
- [ ] Upload files to Supabase storage
- [ ] Display upload progress
- [ ] Show file preview in message
- [ ] Add file removal option

Emoji Picker:
- [ ] Integrate emoji picker library (emoji-mart or similar)
- [ ] Add emoji button to MessageInput
- [ ] Position picker appropriately
- [ ] Support emoji search
- [ ] Add recently used emojis
- [ ] Implement keyboard shortcut (Cmd/Ctrl+E)

**File Locations:**
- apps/web/components/messaging/MessageInput.tsx:51
- apps/web/components/messaging/MessageInput.tsx:56

**Estimated Effort:** 6-8 hours (3-4 file upload, 2-3 emoji picker, 1 integration)
```

#### 5.2 Contractor Social Features
**Files:**
- `apps/mobile/src/screens/ContractorSocialScreen.tsx:186`
- `apps/mobile/src/screens/ContractorSocialScreen.tsx:199`
- `apps/mobile/src/screens/ContractorSocialScreen.tsx:205`

**TODOs:**
- Line 186: `// TODO: Navigate to comment screen or show comment modal`
- Line 199: `// TODO: Implement actual sharing functionality`
- Line 205: `// TODO: Show post options menu`

**Priority:** P2
**Estimated Effort:** 8-10 hours

**GitHub Issue Template:**
```markdown
**Title:** Complete Contractor Social Feed Features

**Labels:** P2, enhancement, mobile, social, contractor

**Description:**
Implement remaining social feed features: comments, sharing, and post options.

**Current State:**
- Social feed displays posts
- Interaction handlers are stubbed
- No comment, share, or options functionality

**Requirements:**
Comments:
- [ ] Create comment screen/modal UI
- [ ] Implement GET /api/posts/:id/comments endpoint
- [ ] Implement POST /api/posts/:id/comments endpoint
- [ ] Add comment like/reply functionality
- [ ] Show comment count updates

Sharing:
- [ ] Integrate React Native Share API
- [ ] Support share to social media
- [ ] Generate shareable links
- [ ] Track share analytics
- [ ] Add copy link option

Post Options Menu:
- [ ] Create options bottom sheet
- [ ] Add edit post option (author only)
- [ ] Add delete post option (author only)
- [ ] Add report post option
- [ ] Add save/bookmark option
- [ ] Add turn off notifications option

**File Locations:**
- apps/mobile/src/screens/ContractorSocialScreen.tsx:186
- apps/mobile/src/screens/ContractorSocialScreen.tsx:199
- apps/mobile/src/screens/ContractorSocialScreen.tsx:205

**Estimated Effort:** 8-10 hours
```

#### 5.3 Notification Service Integration
**File:** `apps/mobile/src/screens/home/HomeScreen.refactored.tsx:111`
**TODO:** `unreadNotifications={0} // TODO: Connect to notifications service`
**Priority:** P2
**Estimated Effort:** 4-6 hours

**GitHub Issue Template:**
```markdown
**Title:** Integrate Real-time Notifications Service

**Labels:** P2, enhancement, mobile, notifications

**Description:**
Connect HomeScreen to notifications service for real-time unread count updates.

**Requirements:**
Backend:
- [ ] Create GET /api/notifications/unread-count endpoint
- [ ] Implement real-time notification system (WebSocket/SSE)
- [ ] Add notification generation for key events

Frontend:
- [ ] Replace hardcoded 0 with API call
- [ ] Implement real-time updates
- [ ] Add notification polling fallback
- [ ] Show badge with unread count
- [ ] Update count on notification interaction

**File Location:**
apps/mobile/src/screens/home/HomeScreen.refactored.tsx:111

**Estimated Effort:** 4-6 hours
```

---

### Category 6: UI Components (P3)

#### 6.1 Home Screen Components
**Files:**
- `apps/mobile/src/screens/home/HomeScreen.refactored.tsx:137`
- `apps/mobile/src/screens/home/HomeScreen.refactored.tsx:144`

**TODOs:**
- Line 137: `{/* TODO: Add ContractorStats component */}`
- Line 144: `{/* TODO: Add PreviousConnections component */}`

**Priority:** P3
**Estimated Effort:** 6-8 hours (3-4 hours each)

**GitHub Issue Template:**
```markdown
**Title:** Create ContractorStats and PreviousConnections Components

**Labels:** P3, enhancement, mobile, ui, contractor

**Description:**
Design and implement ContractorStats and PreviousConnections components for HomeScreen.

**Requirements:**
ContractorStats Component:
- [ ] Design component UI (earnings, jobs, ratings)
- [ ] Create GET /api/contractor/stats endpoint
- [ ] Implement component with loading states
- [ ] Add period selector (week, month, year)
- [ ] Include visual graphs/charts
- [ ] Add comparison to previous period

PreviousConnections Component:
- [ ] Design component UI (recent clients/contractors)
- [ ] Create GET /api/connections/recent endpoint
- [ ] Display connection list with avatars
- [ ] Add "View All" navigation
- [ ] Show last interaction timestamp
- [ ] Add quick action buttons (message, rate)

**File Locations:**
- apps/mobile/src/screens/home/HomeScreen.refactored.tsx:137
- apps/mobile/src/screens/home/HomeScreen.refactored.tsx:144

**Estimated Effort:** 6-8 hours
```

#### 6.2 UI Component Standardization
**File:** `apps/mobile/src/components/ui/index.ts:160`
**TODO:** `// TODO: Add remaining components as they're standardized`
**Priority:** P3
**Estimated Effort:** Ongoing effort

**GitHub Issue Template:**
```markdown
**Title:** Complete UI Component Library Standardization

**Labels:** P3, enhancement, mobile, design-system, ui

**Description:**
Continue standardizing and exporting UI components in the central ui/index.ts file.

**Current State:**
- Design system foundation established
- Many components still need standardization
- Component exports incomplete

**Requirements:**
- [ ] Audit all screen-specific components
- [ ] Identify reusable components
- [ ] Standardize component APIs (props, variants)
- [ ] Add TypeScript types
- [ ] Add component documentation
- [ ] Export from ui/index.ts
- [ ] Update consuming screens

**Components to Standardize:**
- Form components (Select, Checkbox, Radio, Switch)
- Layout components (Grid, Stack, Spacer)
- Feedback components (Toast, Alert, Banner)
- Data display (Table, List, Card)
- Navigation (Tabs, Breadcrumbs)

**File Location:**
apps/mobile/src/components/ui/index.ts:160

**Estimated Effort:** Ongoing (track in separate issues per component)
```

---

### Category 7: Type System & Architecture (P3)

#### 7.1 Domain Types Completion
**File:** `apps/mobile/src/types/database.refactored.ts:34`
**TODO:** `// TODO: Add remaining domain types as they are created`
**Priority:** P3
**Estimated Effort:** Ongoing effort

**GitHub Issue Template:**
```markdown
**Title:** Complete Domain Type Definitions

**Labels:** P3, enhancement, mobile, typescript, architecture

**Description:**
Continue adding domain types to database.refactored.ts as new features are developed.

**Current State:**
- Core types defined
- Feature-specific types need extraction

**Requirements:**
- [ ] Audit all inline types in screens/components
- [ ] Extract to domain types
- [ ] Add JSDoc documentation
- [ ] Ensure consistency with backend types
- [ ] Add validation schemas
- [ ] Update imports across codebase

**Domain Areas:**
- Messaging types
- Payment types
- Review/Rating types
- Analytics types
- Settings types

**File Location:**
apps/mobile/src/types/database.refactored.ts:34

**Estimated Effort:** Ongoing (track in separate issues per domain)
```

---

### Category 8: AI & Advanced Features (P3)

#### 8.1 AI Service Integration
**File:** `apps/mobile/src/services/AIAnalysisService.ts:35`
**TODO:** `// TODO: Replace with real AI service integration`
**Priority:** P3
**Estimated Effort:** 8-12 hours

**GitHub Issue Template:**
```markdown
**Title:** Integrate Real AI Service for Analysis Features

**Labels:** P3, enhancement, ai, backend, mobile

**Description:**
Replace mock AI service with actual AI integration (OpenAI, Anthropic, or custom model).

**Current State:**
- AIAnalysisService returns mock data
- No real AI processing

**Requirements:**
Backend:
- [ ] Choose AI service provider
- [ ] Create backend proxy endpoint for AI calls
- [ ] Implement prompt engineering
- [ ] Add response caching
- [ ] Implement rate limiting
- [ ] Add cost tracking
- [ ] Handle AI service errors gracefully

Frontend:
- [ ] Update AIAnalysisService to call backend
- [ ] Add loading states with progress
- [ ] Implement streaming responses if supported
- [ ] Add error handling with user feedback
- [ ] Cache AI responses locally

**Use Cases:**
- Service request description analysis
- Contractor profile recommendations
- Price estimation
- Project scope analysis

**File Location:**
apps/mobile/src/services/AIAnalysisService.ts:35

**Estimated Effort:** 8-12 hours
```

---

### Category 9: Testing & Quality (P3)

#### 9.1 Test Coverage Improvements
**Files:**
- `scripts/test-coverage-enforcer.js:287`
- `scripts/test-coverage-enforcer.js:322`
- `scripts/test-coverage-enforcer.js:332`

**TODOs:**
- Line 287: `// TODO: Add more comprehensive tests`
- Line 322: `// TODO: Add specific method tests`
- Line 332: `// TODO: Add more comprehensive tests`

**Priority:** P3
**Estimated Effort:** 4-6 hours

**GitHub Issue Template:**
```markdown
**Title:** Add Comprehensive Tests for Coverage Enforcer

**Labels:** P3, testing, infrastructure, quality

**Description:**
Improve test coverage for the test-coverage-enforcer.js script itself.

**Current State:**
- Script has basic tests
- Many edge cases untested
- Method-specific tests missing

**Requirements:**
- [ ] Add tests for all enforcer methods
- [ ] Test edge cases (empty coverage, missing files, etc.)
- [ ] Add integration tests
- [ ] Test CI/CD failure scenarios
- [ ] Add performance tests for large codebases
- [ ] Test configuration validation
- [ ] Achieve 90%+ coverage for the enforcer

**File Location:**
scripts/test-coverage-enforcer.js (lines 287, 322, 332)

**Estimated Effort:** 4-6 hours
```

---

## Summary Statistics

| Category | P1 | P2 | P3 | Total |
|----------|----|----|----|----|
| Error Tracking & Monitoring | 2 | 1 | 0 | 3 |
| API Endpoints | 4 | 0 | 0 | 4 |
| Storage & File Upload | 2 | 0 | 0 | 2 |
| Security & Infrastructure | 1 | 1 | 0 | 2 |
| Feature Completions | 0 | 3 | 0 | 3 |
| UI Components | 0 | 0 | 3 | 3 |
| Type System & Architecture | 0 | 0 | 1 | 1 |
| AI & Advanced Features | 0 | 0 | 1 | 1 |
| Testing & Quality | 0 | 0 | 1 | 1 |
| **TOTAL** | **8** | **5** | **6** | **29** |

---

## Effort Estimation

### Total Estimated Hours by Priority
- **P1 (High):** 38-50 hours (~1 week for 1 developer)
- **P2 (Medium):** 32-43 hours (~1 week for 1 developer)
- **P3 (Low):** 22-30 hours + ongoing efforts

### Recommended Sprint Planning

#### Sprint 1 (Week 1): P1 Critical Path
Focus: Production readiness
- Error tracking integration (both mobile & web)
- Contractor verification API
- Storage service integration
- Secure credential management

#### Sprint 2 (Week 2): P1 Completion + P2 Start
Focus: Feature completion
- Invoice management APIs
- Rate limiting implementation
- Notification settings backend
- Message input enhancements

#### Sprint 3 (Week 3): P2 & Selected P3
Focus: UX improvements
- Contractor social features
- Notification service integration
- Home screen components
- AI service integration (if prioritized)

---

## Next Steps

### For Project Manager:
1. Review and approve priority classifications
2. Assign items to specific developers
3. Create GitHub issues using provided templates
4. Add to sprint planning board
5. Identify any items requiring architectural decisions

### For Development Team:
1. Review technical requirements for assigned items
2. Identify dependencies between tasks
3. Flag any unclear requirements
4. Estimate effort for team velocity planning

### For DevOps/Infrastructure:
1. Set up Sentry accounts and configure DSNs
2. Provision Redis for rate limiting
3. Configure Supabase storage buckets
4. Set up credential management service

---

## GitHub Issue Creation Checklist

When creating issues from this document:

- [ ] Copy issue template from relevant section
- [ ] Add appropriate labels (priority, type, area)
- [ ] Assign to milestone/sprint
- [ ] Add effort estimation
- [ ] Link related issues
- [ ] Add acceptance criteria
- [ ] Tag relevant team members
- [ ] Add to project board

---

## Maintenance Notes

This document should be updated:
- When TODOs are completed (remove from list)
- When new TODOs are added to codebase (add to list)
- When priorities change (update classifications)
- After sprint planning (update sprint assignments)

**Last Updated:** 2025-10-22
**Next Review:** After Sprint 1 completion
