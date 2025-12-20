# Feature Access System - Quick Start Guide

## 5-Minute Setup

### 1. Run Database Migration

```bash
cd apps/web
npx supabase migration up
```

### 2. Protect a Feature (Web)

```tsx
import { FeatureGate } from '@/components/ui/FeatureGate';

export function SocialFeedPage() {
  return (
    <FeatureGate featureId="CONTRACTOR_SOCIAL_FEED">
      <SocialFeed />
    </FeatureGate>
  );
}
```

### 3. Show Upgrade Banner

```tsx
<FeatureGate
  featureId="CONTRACTOR_ADVANCED_ANALYTICS"
  mode="banner"
>
  <AnalyticsChart />
</FeatureGate>
```

### 4. Track Usage for Metered Features

```tsx
<FeatureGate
  featureId="CONTRACTOR_BID_LIMIT"
  trackUsage={true}
>
  <BidForm />
</FeatureGate>
```

## Common Patterns

### Pattern 1: Protected Page

```tsx
// /contractor/social/page.tsx
import { FeatureGate } from '@/components/ui/FeatureGate';
import { SocialFeed } from './components/SocialFeed';

export default function SocialPage() {
  return (
    <FeatureGate featureId="CONTRACTOR_SOCIAL_FEED">
      <SocialFeed />
    </FeatureGate>
  );
}
```

### Pattern 2: Protected Button with Usage Tracking

```tsx
import { FeatureButton } from '@/components/ui/FeatureGate';

export function BidSubmitButton() {
  return (
    <FeatureButton
      featureId="CONTRACTOR_BID_LIMIT"
      trackUsage={true}
      onClick={handleSubmitBid}
      className="btn-primary"
    >
      Submit Bid
    </FeatureButton>
  );
}
```

### Pattern 3: Show Different UI Based on Access

```tsx
import { useFeature } from '@/hooks/useFeatureAccess';

export function Dashboard() {
  const { hasAccess } = useFeature('CONTRACTOR_ADVANCED_ANALYTICS');

  return hasAccess ? <AdvancedDashboard /> : <BasicDashboard />;
}
```

### Pattern 4: Display Remaining Usage

```tsx
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export function BidCounter() {
  const { getRemainingUsage } = useFeatureAccess();
  const remaining = getRemainingUsage('CONTRACTOR_BID_LIMIT');

  return (
    <div className="badge">
      Bids: {remaining === 'unlimited' ? '∞' : remaining}
    </div>
  );
}
```

### Pattern 5: Mobile (React Native)

```typescript
import { featureAccess } from '@/utils/featureAccess';

// Check access
if (featureAccess.hasAccess('CONTRACTOR_BID_LIMIT', user.role)) {
  // User has access
  showBidForm();
} else {
  // Show upgrade prompt
  showUpgradeAlert();
}

// Track usage
await featureAccess.trackUsage(user.id, 'CONTRACTOR_BID_LIMIT');
```

## All Available Features

### Homeowner Features (All Free)
- `HOMEOWNER_POST_JOBS` - Post job listings
- `HOMEOWNER_MESSAGING` - Chat with contractors
- `HOMEOWNER_VIDEO_CALLS` - Video calls
- `HOMEOWNER_AI_ASSESSMENT` - AI building assessments
- `HOMEOWNER_SECURE_PAYMENTS` - Secure payments
- `HOMEOWNER_ESCROW` - Escrow protection

### Contractor Features (Tiered)

#### Bidding & Discovery
- `CONTRACTOR_BID_LIMIT` - Monthly bid limit (5/20/100/unlimited)
- `CONTRACTOR_DISCOVERY_CARD` - Discovery feed (Basic+)
- `CONTRACTOR_FEATURED_LISTING` - Featured placement (Professional+)
- `CONTRACTOR_PRIORITY_PLACEMENT` - Priority placement (Enterprise)

#### Social & Community
- `CONTRACTOR_SOCIAL_FEED` - Social feed access (Professional+)
- `CONTRACTOR_POST_LIMIT` - Social posts/month (20/unlimited)
- `CONTRACTOR_GROUPS` - Contractor groups (Professional+)

#### Portfolio & Branding
- `CONTRACTOR_PORTFOLIO_PHOTOS` - Portfolio photos (5/20/100/unlimited)
- `CONTRACTOR_CUSTOM_BRANDING` - Custom branding (Professional+)
- `CONTRACTOR_VERIFIED_BADGE` - Verified badge (Basic+)

#### Analytics
- `CONTRACTOR_BASIC_ANALYTICS` - Basic analytics (All)
- `CONTRACTOR_ADVANCED_ANALYTICS` - Advanced analytics (Professional+)
- `CONTRACTOR_CUSTOM_REPORTS` - Custom reports (Enterprise)

#### Business Tools
- `CONTRACTOR_QUOTE_BUILDER` - Quote builder (All)
- `CONTRACTOR_INVOICE_MANAGEMENT` - Invoices (Basic+)
- `CONTRACTOR_CRM` - CRM tools (Professional+)
- `CONTRACTOR_TEAM_MANAGEMENT` - Team management (Enterprise)
- `CONTRACTOR_API_ACCESS` - API access (Enterprise)

#### Support
- `CONTRACTOR_EMAIL_SUPPORT` - Email support (All)
- `CONTRACTOR_PRIORITY_SUPPORT` - Priority support (Professional+)
- `CONTRACTOR_PHONE_SUPPORT` - Phone support (Enterprise)
- `CONTRACTOR_DEDICATED_ACCOUNT_MANAGER` - Account manager (Enterprise)

#### Marketing
- `CONTRACTOR_MARKETING_TOOLS` - Marketing tools (Professional+)
- `CONTRACTOR_MARKET_INSIGHTS` - Market insights (Professional+)
- `CONTRACTOR_LEAD_GENERATION` - Lead generation (Enterprise)

#### Communication
- `CONTRACTOR_MESSAGING` - Messaging (All)
- `CONTRACTOR_VIDEO_CALLS` - Video calls (All)
- `CONTRACTOR_VIDEO_CALL_RECORDING` - Call recording (Professional+)

#### Content
- `CONTRACTOR_RESOURCES_LIBRARY` - Resources (All)
- `CONTRACTOR_TRAINING_MATERIALS` - Training (Professional+)
- `CONTRACTOR_PUBLISH_ARTICLES` - Publish articles (Professional+)

## Subscription Tiers

| Tier | Price | Duration |
|------|-------|----------|
| Free | £0 | Forever (5 bids/month) |
| Basic | £29 | per month |
| Professional | £79 | per month |
| Enterprise | £199 | per month |

## Component Props Reference

### FeatureGate

```typescript
interface FeatureGateProps {
  featureId: string;              // Required: Feature ID to check
  children: React.ReactNode;      // Content to protect
  mode?: 'modal' | 'banner' | 'hide'; // Display mode (default: 'modal')
  trackUsage?: boolean;           // Track usage on access (default: false)
  fallback?: React.ReactNode;     // Custom fallback content
  onAccessDenied?: (result) => void; // Callback when denied
  onUpgrade?: (tier) => void;     // Callback on upgrade click
  loadingComponent?: React.ReactNode; // Custom loading state
}
```

### FeatureButton

```typescript
interface FeatureButtonProps {
  featureId: string;              // Required: Feature ID to check
  trackUsage?: boolean;           // Track usage on click (default: true)
  onUpgrade?: (tier) => void;     // Callback on upgrade click
  onClick?: (e) => void;          // Button click handler
  children: React.ReactNode;      // Button content
  // ...all standard button props
}
```

### Paywall

```typescript
interface PaywallProps {
  isOpen: boolean;                // Show/hide modal
  onClose: () => void;            // Close handler
  feature: FeatureDefinition;     // Feature to upgrade for
  currentTier: SubscriptionTier;  // User's current tier
  upgradeTiers: SubscriptionTier[]; // Available upgrade tiers
  onUpgrade?: (tier) => void;     // Upgrade handler
}
```

## Hook API Reference

### useFeatureAccess()

```typescript
const {
  // State
  user,                           // Current user
  subscription,                   // Subscription info
  loading,                        // Loading state
  tier,                          // Current tier
  status,                        // Subscription status
  bidsUsed,                      // Bids used this month (free tier)
  bidsResetDate,                 // Next bid reset date

  // Methods
  hasAccess,                     // Check feature access
  trackUsage,                    // Track feature usage
  getRemainingUsage,             // Get remaining usage
  shouldShowPaywall,             // Should show paywall
  getFeature,                    // Get feature definition
  getAvailableFeatures,          // Get all available features
} = useFeatureAccess();
```

### useFeature(featureId)

```typescript
const {
  hasAccess,                     // Does user have access
  limit,                         // Feature limit
  used,                          // Current usage
  remaining,                     // Remaining usage
  requiresUpgrade,               // Needs upgrade
  upgradeTiers,                  // Available tiers
  feature,                       // Feature definition
  loading,                       // Loading state
  trackUsage,                    // Track usage method
} = useFeature('CONTRACTOR_BID_LIMIT');
```

## Mobile API Reference

```typescript
// Initialize
featureAccess.initialize(userId, role);

// Check access
featureAccess.hasAccess(featureId, role);

// Get remaining
featureAccess.getRemainingUsage(featureId);

// Track usage
await featureAccess.trackUsage(userId, featureId);

// Get tier
featureAccess.getTier();

// Get feature
featureAccess.getFeature(featureId);

// Get upgrade tiers
featureAccess.getUpgradeTiers(featureId);

// Clear cache
featureAccess.clear();
```

## Common Scenarios

### Scenario 1: Protect an entire page
```tsx
<FeatureGate featureId="CONTRACTOR_SOCIAL_FEED">
  <PageContent />
</FeatureGate>
```

### Scenario 2: Protect a button action
```tsx
<FeatureButton
  featureId="CONTRACTOR_BID_LIMIT"
  trackUsage={true}
  onClick={handleAction}
>
  Submit
</FeatureButton>
```

### Scenario 3: Show upgrade banner
```tsx
<FeatureGate featureId="FEATURE_ID" mode="banner">
  <Content />
</FeatureGate>
```

### Scenario 4: Conditionally render
```tsx
const { hasAccess } = useFeature('FEATURE_ID');
return hasAccess ? <Premium /> : <Basic />;
```

### Scenario 5: Display remaining usage
```tsx
const { getRemainingUsage } = useFeatureAccess();
const remaining = getRemainingUsage('CONTRACTOR_BID_LIMIT');
```

## Need Help?

1. Check the [full documentation](./FEATURE_ACCESS_SYSTEM.md)
2. Review the code examples
3. Contact the development team

---

**Last Updated:** 2025-03-01
