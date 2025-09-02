# 📋 **MVP SCOPE DEFINITION**
*Mintenance App - Core Features Only*

## 🎯 **MVP PHILOSOPHY**

**Goal**: Launch a functional, reliable maintenance booking platform focusing on core value proposition - connecting homeowners with contractors for home maintenance jobs.

**Principle**: Better to launch with fewer features that work perfectly than many features that work poorly.

---

## ✅ **MVP FEATURES (INCLUDED)**

### **Core User Management**
- User registration and authentication
- Role-based access (homeowner/contractor)
- Basic profile management
- Email verification

### **Essential Job Management**
- Job posting by homeowners
- Job browsing for contractors
- Basic job details (title, description, budget, location)
- Job status tracking (posted → assigned → completed)
- Photo upload for job descriptions

### **Simple Bidding System**
- Contractors can place bids on jobs
- Homeowners can accept/reject bids
- Basic bid information (amount, message, timeline)
- One bid per contractor per job

### **Basic Payment Integration**
- Stripe payment processing
- Simple escrow system
- Payment release on job completion
- Transaction history

### **Essential Messaging**
- Direct messaging between homeowner and assigned contractor
- Real-time message updates
- Basic message history

### **Core Categories**
- Plumbing
- Electrical
- HVAC
- Handyman Services
- Cleaning
- Landscaping

---

## ❌ **POST-MVP FEATURES (REMOVED)**

### **AI Analysis Features** 🤖
```typescript
// REMOVED from types
export interface AIAnalysis { ... }
export interface AIConcern { ... }

// REMOVED from Job interface
aiAnalysis?: AIAnalysis;
```

**Files to Disable:**
- `src/services/AIAnalysisService.ts`
- `src/services/RealAIAnalysisService.ts`
- AI-related components in JobDetailsScreen
- AI analysis in job posting flow

### **Contractor Social Network** 📱
```typescript
// REMOVED social features
export interface ContractorPost { ... }
export interface ContractorPostComment { ... }
export interface ContractorFollow { ... }
export interface ContractorEndorsement { ... }
```

**Files to Disable:**
- `src/screens/ContractorSocialScreen.tsx`
- `src/components/ContractorPost.tsx`
- `src/services/ContractorSocialService.ts`
- Social networking navigation

### **Advanced Features**
- Contractor discovery/matching system
- Social feed functionality
- Advanced analytics and reporting
- Complex notification preferences
- Multi-photo galleries
- Video uploads
- Advanced search filters
- Contractor endorsements
- Skill verification system

---

## 🔧 **IMPLEMENTATION CHANGES**

### **1. Updated Job Interface (MVP)**
```typescript
export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  homeowner_id: string;
  contractor_id?: string;
  status: 'posted' | 'assigned' | 'in_progress' | 'completed';
  budget: number;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  photos?: string[]; // Max 3 photos for MVP
  created_at: string;
  updated_at: string;
  // REMOVED: aiAnalysis, subcategory, advanced fields
}
```

### **2. Simplified Navigation**
```typescript
// MVP Navigation Structure
- HomeTab
  - HomeScreen
  - JobPostingScreen (homeowners)
  - JobsScreen (browsing for contractors)
  
- JobsTab  
  - MyJobs (posted jobs for homeowners)
  - ActiveBids (bid jobs for contractors)
  
- MessagesTab
  - MessagesList
  - MessagingScreen
  
- ProfileTab
  - ProfileScreen
  - SettingsScreen

// REMOVED:
// - ContractorSocialScreen
// - ContractorDiscoveryScreen
// - Advanced analytics screens
```

### **3. Database Schema Changes**
```sql
-- Remove AI analysis columns
ALTER TABLE jobs DROP COLUMN IF EXISTS ai_analysis;
ALTER TABLE jobs DROP COLUMN IF EXISTS subcategory;
ALTER TABLE jobs DROP COLUMN IF EXISTS complexity_score;

-- Keep essential columns only
-- id, title, description, location, homeowner_id, contractor_id
-- status, budget, category, priority, created_at, updated_at

-- Remove social networking tables (keep for later)
-- contractor_posts, contractor_post_comments, contractor_follows
-- contractor_endorsements (disable, don't drop for future)
```

---

## 📱 **MVP USER FLOWS**

### **Homeowner Flow**
1. **Sign Up** → Email verification → Profile setup
2. **Post Job** → Title, description, budget, photos → Publish
3. **Receive Bids** → Review contractor bids → Accept best bid
4. **Pay Escrow** → Stripe payment → Funds held in escrow
5. **Communicate** → Message with contractor → Track progress
6. **Complete Job** → Mark complete → Release payment

### **Contractor Flow**
1. **Sign Up** → Email verification → Profile setup → Skills selection
2. **Browse Jobs** → Filter by category → View job details
3. **Place Bid** → Amount, message, timeline → Submit bid
4. **Get Hired** → Notification of acceptance → Start work
5. **Communicate** → Update homeowner → Complete work
6. **Get Paid** → Job marked complete → Receive payment

---

## 🚀 **MVP SUCCESS CRITERIA**

### **Functional Requirements**
- [x] User registration works without errors
- [x] Job posting completes successfully
- [x] Bidding system functions properly
- [x] Payment processing works end-to-end
- [x] Messaging system delivers messages
- [x] Core navigation flows smoothly

### **Performance Requirements**
- App startup time < 3 seconds
- Job list loading < 2 seconds
- Message delivery < 5 seconds
- Payment processing < 30 seconds
- 99%+ app stability (< 1% crash rate)

### **User Experience Requirements**
- Intuitive navigation between core features
- Clear visual feedback for all actions
- Responsive design on mobile devices
- Accessible for basic screen reader support

---

## 📈 **POST-MVP ROADMAP**

### **Phase 2: Enhanced Features (Month 2-3)**
- AI-powered job analysis
- Advanced search and filtering
- Contractor ratings and reviews system
- Push notifications preferences
- Multiple photo uploads

### **Phase 3: Social Features (Month 4-5)**
- Contractor social networking
- Skill endorsements
- Work showcase galleries
- Contractor discovery matching

### **Phase 4: Advanced Platform (Month 6+)**
- Analytics and reporting
- Advanced payment features
- Integration with external services
- Multi-language support

---

## ✅ **MVP IMPLEMENTATION CHECKLIST**

- [ ] Remove AI analysis from Job interface
- [ ] Disable AIAnalysisService imports
- [ ] Remove AI components from JobDetailsScreen
- [ ] Disable ContractorSocialScreen navigation
- [ ] Update database schema (remove AI columns)
- [ ] Simplify job posting flow (no AI analysis)
- [ ] Test core user flows end-to-end
- [ ] Update test coverage for MVP features only
- [ ] Remove non-MVP routes from navigation
- [ ] Clean up package dependencies (remove AI libraries)

**Estimated Effort**: 1-2 weeks to remove non-MVP features and stabilize core functionality.

**Result**: Focused, reliable app ready for initial market validation and user feedback.