# Mintenance App - Complete Pages & Screens Inventory

This document provides a comprehensive list of all pages (web) and screens (mobile) in the Mintenance platform.

---

## 📱 **MOBILE APP (Expo React Native)**

### **Authentication Flow** (`AuthNavigator`)
- **Landing Screen** - Welcome/onboarding screen
- **Login Screen** - User authentication
- **Register Screen** - New user registration
- **Forgot Password Screen** - Password recovery

### **Main Tab Navigation** (`TabNavigator`)

#### **Home Tab** (`HomeTab`)
- **Home Screen** - Main dashboard (role-based: Homeowner/Contractor)

#### **Discover Tab** (`DiscoverTab`) - Optional, map-enabled
- **Explore Map Screen** - Map view of contractors
- **Contractor Profile Screen** - Contractor details from map

#### **Jobs Tab** (`JobsTab` / `JobsNavigator`)
- **Jobs List Screen** - Browse available jobs
- **Job Details Screen** - View job information
- **Job Posting Screen** - Create new job posting
- **Bid Submission Screen** - Submit bid on job

#### **Feed Tab** (`FeedTab`)
- **Contractor Social Screen** - Community feed/social posts

#### **Messages Tab** (`MessagingTab` / `MessagingNavigator`)
- **Messages List Screen** - All conversations
- **Messaging Screen** - Individual conversation view

#### **Profile Tab** (`ProfileTab` / `ProfileNavigator`)
- **Profile Main Screen** - User profile overview
- **Edit Profile Screen** - Update profile information
- **Notification Settings Screen** - Manage notification preferences
- **Payment Methods Screen** - Manage payment methods
- **Add Payment Method Screen** - Add new payment method
- **Help Center Screen** - Support and help resources
- **Invoice Management Screen** - View and manage invoices
- **CRM Dashboard Screen** - Customer relationship management
- **Finance Dashboard Screen** - Financial overview and analytics
- **Service Areas Screen** - Manage service coverage areas
- **Quote Builder Screen** - Create and manage quotes
- **Create Quote Screen** - New quote creation
- **Contractor Card Editor Screen** - Edit discovery card
- **Connections Screen** - Manage professional connections

### **Modal Screens** (`ModalNavigator`)
- **Service Request Screen** - Create service request (homeowner)
- **Find Contractors Screen** - Search for contractors
- **Contractor Discovery Screen** - Discover contractors
- **Create Quote Screen** - Create quote (modal)
- **Meeting Schedule Screen** - Schedule meetings
- **Meeting Details Screen** - View meeting details
- **Contractor Profile Screen** - View contractor profile (modal)
- **Enhanced Home Screen** - Enhanced home view

### **Additional Standalone Screens**
- **AISearchScreen** - AI-powered search
- **VideoCallScreen** - Video call interface
- **PaymentScreen** - Payment processing
- **NotificationScreen** - Notifications list
- **NotificationPreferencesScreen** - Notification preferences
- **BookingStatusScreen** - Booking status tracking
- **ContractorVerificationScreen** - Contractor verification process
- **ContractorGalleryScreen** - Contractor photo gallery
- **ContractorMapScreen** - Map view of contractors
- **PerformanceDashboardScreen** - Performance metrics

---

## 🌐 **WEB APP (Next.js 16 App Router)**

### **Public Pages**

#### **Landing & Marketing**
- `/` - Home/Landing page
- `/about` - About page
- `/how-it-works` - How it works page
- `/pricing` - Pricing page
- `/contact` - Contact page
- `/company` - Company information
- `/blog` - Blog listing
- `/faq` - Frequently asked questions
- `/terms` - Terms of service
- `/privacy` - Privacy policy

#### **Authentication**
- `/login` - User login
- `/register` - User registration
- `/forgot-password` - Password recovery
- `/reset-password` - Password reset
- `/verify-phone` - Phone verification
- `/auth/callback` - OAuth callback

### **User Dashboard & Core Features**

#### **Dashboard**
- `/dashboard` - Main user dashboard

#### **Jobs**
- `/jobs` - Jobs listing
- `/jobs/[id]` - Job details
- `/jobs/[id]/edit` - Edit job
- `/jobs/[id]/review` - Review job
- `/jobs/[id]/payment` - Job payment
- `/jobs/[id]/sign-off` - Job sign-off
- `/jobs/create` - Create new job
- `/jobs/tracking` - Job tracking
- `/jobs/page-new` - New jobs page (alternative)

#### **Contractors**
- `/contractors` - Contractors listing
- `/contractors/[id]` - Contractor profile
- `/contractors/map` - Contractors map view
- `/find-contractors` - Find contractors search

#### **Messages**
- `/messages` - Messages list
- `/messages/[jobId]` - Job conversation

#### **Properties**
- `/properties` - Properties list
- `/properties/[id]` - Property details
- `/properties/add` - Add property

#### **Payments**
- `/payments` - Payments overview
- `/payments/[transactionId]` - Transaction details
- `/payment-methods` - Payment methods management
- `/checkout` - Checkout page
- `/checkout/return` - Checkout return/callback

#### **Scheduling**
- `/scheduling` - Scheduling overview
- `/scheduling/meetings` - Meetings list

#### **Video Calls**
- `/video-calls` - Video calls interface

#### **Notifications**
- `/notifications` - Notifications list

#### **Profile & Settings**
- `/profile` - User profile
- `/settings` - User settings
- `/settings/payment-methods` - Payment methods settings

#### **Help & Support**
- `/help` - Help center
- `/help/[category]` - Help category
- `/help/[category]/[slug]` - Help article

#### **Search & Discovery**
- `/search` - Search page
- `/discover` - Discover contractors
- `/ai-search` - AI-powered search
- `/favorites` - Favorites list

#### **Analytics & Reporting**
- `/analytics` - Analytics dashboard
- `/performance` - Performance metrics
- `/reporting` - Reporting dashboard
- `/financials` - Financial overview

#### **Disputes**
- `/disputes/create` - Create dispute
- `/disputes/[id]` - Dispute details

#### **Invoices**
- `/invoices/[invoiceId]` - Invoice details

#### **Timeline**
- `/timeline/[jobId]` - Job timeline

#### **Building Assessments**
- `/building-assessments/[id]` - Assessment details
- `/building-assessments/[id]/correct` - Assessment correction

#### **Offline**
- `/offline` - Offline mode page

### **Contractor-Specific Pages** (`/contractor/*`)

#### **Dashboard**
- `/contractor` - Contractor dashboard
- `/contractor/dashboard-enhanced` - Enhanced dashboard

#### **Jobs & Bids**
- `/contractor/jobs` - Contractor jobs list
- `/contractor/jobs/[id]` - Contractor job details
- `/contractor/jobs-near-you` - Jobs near you
- `/contractor/bid` - Bid overview
- `/contractor/bid/[jobId]` - Submit bid for job

#### **Quotes**
- `/contractor/quotes` - Quotes list
- `/contractor/quotes/[id]` - Quote details
- `/contractor/quotes/create` - Create quote

#### **Profile & Settings**
- `/contractor/profile` - Contractor profile
- `/contractor/[id]` - Contractor public profile
- `/contractor/settings` - Contractor settings
- `/contractor/verification` - Verification status

#### **Financial**
- `/contractor/finance` - Finance dashboard
- `/contractor/payouts` - Payouts overview
- `/contractor/payout/success` - Payout success
- `/contractor/payout/refresh` - Refresh payout
- `/contractor/invoices` - Invoices list
- `/contractor/expenses` - Expenses tracking
- `/contractor/escrow` - Escrow management
- `/contractor/escrow/status` - Escrow status

#### **Business Tools**
- `/contractor/crm` - CRM dashboard
- `/contractor/customers` - Customers list
- `/contractor/reporting` - Reporting tools
- `/contractor/market-insights` - Market insights
- `/contractor/marketing` - Marketing tools
- `/contractor/tools` - Business tools

#### **Portfolio & Gallery**
- `/contractor/portfolio` - Portfolio showcase
- `/contractor/gallery` - Photo gallery
- `/contractor/card-editor` - Edit discovery card

#### **Social & Community**
- `/contractor/social` - Social feed
- `/contractor/social/post/[id]` - Social post details
- `/contractor/connections` - Professional connections
- `/contractor/reviews` - Reviews management

#### **Resources & Support**
- `/contractor/resources` - Resources library
- `/contractor/support` - Support center
- `/contractor/discover` - Discover opportunities

#### **Service Management**
- `/contractor/service-areas` - Service areas management
- `/contractor/calendar` - Calendar view
- `/contractor/time-tracking` - Time tracking

#### **Documents & Compliance**
- `/contractor/documents` - Documents management
- `/contractor/certifications` - Certifications
- `/contractor/insurance` - Insurance information

#### **Team**
- `/contractor/team` - Team management

#### **Subscription**
- `/contractor/subscription` - Subscription management
- `/contractor/subscription/checkout` - Subscription checkout
- `/contractor/subscription/payment-methods` - Subscription payment methods

### **Homeowner-Specific Pages** (`/homeowner/*`)
- `/homeowner/escrow/approve` - Approve escrow

### **Admin Pages** (`/admin/*`)

#### **Authentication**
- `/admin/login` - Admin login
- `/admin/register` - Admin registration
- `/admin/(auth)/login` - Auth group login
- `/admin/(auth)/register` - Auth group register
- `/admin/(auth)/forgot-password` - Admin password recovery

#### **Dashboard**
- `/admin` - Admin dashboard
- `/admin/dashboard` - Admin dashboard (alternative)

#### **User Management**
- `/admin/users` - Users management

#### **Contractors**
- `/admin/contractors/payment-setup` - Contractor payment setup

#### **Analytics**
- `/admin/analytics-detail` - Analytics details

#### **Payments & Revenue**
- `/admin/payments/fees` - Payment fees management
- `/admin/revenue` - Revenue overview
- `/admin/escrow/reviews` - Escrow reviews

#### **System Management**
- `/admin/settings` - System settings
- `/admin/system-settings` - System configuration
- `/admin/security` - Security settings
- `/admin/audit-logs` - Audit logs
- `/admin/data-annotation` - Data annotation

#### **Communications**
- `/admin/communications` - Communications management

#### **Building Assessments**
- `/admin/building-assessments` - Building assessments management

#### **API & Documentation**
- `/admin/api-documentation` - API documentation

---

## 📊 **Summary Statistics**

### **Mobile App**
- **Total Screens**: ~50+ screens
- **Navigation Groups**: 6 (Auth, Jobs, Messaging, Profile, Modal, Discover)
- **Main Tabs**: 5-6 tabs (Home, Discover, Jobs, Feed, Messages, Profile)

### **Web App**
- **Total Pages**: ~150+ pages
- **Public Pages**: ~15 pages
- **User Pages**: ~80+ pages
- **Contractor Pages**: ~60+ pages
- **Admin Pages**: ~20+ pages
- **API Routes**: 100+ API endpoints

---

## 🔄 **Shared Features Across Platforms**

### **Common Features**
- Authentication (Login, Register, Password Reset)
- Job Management (Create, View, Edit, Track)
- Messaging System
- Payment Processing
- Profile Management
- Notifications
- Search & Discovery
- Contractor Profiles
- Reviews & Ratings

### **Platform-Specific**
- **Web**: More comprehensive admin panel, detailed analytics, complex forms
- **Mobile**: Map-based discovery, enhanced mobile UX, push notifications, offline support

---

## 📝 **Notes**

1. **Route Groups**: Next.js uses route groups `(auth)`, `(dashboard)` for organization without affecting URLs
2. **Dynamic Routes**: Routes with `[id]`, `[jobId]`, `[category]`, etc. are parameterized
3. **Modal Screens**: Mobile app uses modal presentation for certain screens
4. **Role-Based Access**: Many pages are role-specific (homeowner, contractor, admin)
5. **API Routes**: All API routes are under `/api/*` and not listed as user-facing pages

---

*Last Updated: Based on current codebase structure*
*Total Count: ~200+ unique pages/screens across both platforms*

