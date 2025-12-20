# Feature Access System

**Production-ready subscription tier and feature gating system for Mintenance.**

## Quick Start

### 1. Import Components

```tsx
import { FeatureGate } from '@/components/ui/FeatureGate';
// or
import { FeatureGate } from '@/lib/feature-access';
```

### 2. Protect a Feature

```tsx
export default function SocialPage() {
  return (
    <FeatureGate featureId="CONTRACTOR_SOCIAL_FEED">
      <SocialFeedContent />
    </FeatureGate>
  );
}
```

### 3. Track Usage (Metered Features)

```tsx
<FeatureGate
  featureId="CONTRACTOR_BID_LIMIT"
  trackUsage={true}
>
  <BidSubmissionForm />
</FeatureGate>
```

## Usage Patterns

### Modal Paywall (Default)
Shows a modal overlay when feature is locked:
```tsx
<FeatureGate featureId="FEATURE_ID">
  <ProtectedContent />
</FeatureGate>
```

### Inline Banner
Shows an upgrade banner instead of modal:
```tsx
<FeatureGate featureId="FEATURE_ID" mode="banner">
  <ProtectedContent />
</FeatureGate>
```

### Hide Content
Simply hide without showing any UI:
```tsx
<FeatureGate featureId="FEATURE_ID" mode="hide">
  <ProtectedContent />
</FeatureGate>
```

### Protected Button
Button that checks access before executing:
```tsx
<FeatureButton
  featureId="CONTRACTOR_BID_LIMIT"
  trackUsage={true}
  onClick={handleAction}
>
  Submit Bid
</FeatureButton>
```

### Programmatic Access Check
```tsx
const { hasAccess, getRemainingUsage } = useFeatureAccess();

const result = hasAccess('CONTRACTOR_BID_LIMIT');
const remaining = getRemainingUsage('CONTRACTOR_BID_LIMIT');

if (result.hasAccess) {
  // User has access
} else {
  // Show upgrade prompt
}
```

## Available Features

See `feature-access-config.ts` for complete list of 50+ features.

### Homeowner Features (All Free)
- `HOMEOWNER_POST_JOBS`
- `HOMEOWNER_MESSAGING`
- `HOMEOWNER_VIDEO_CALLS`
- `HOMEOWNER_AI_ASSESSMENT`
- And more...

### Contractor Features (Tiered)
- `CONTRACTOR_BID_LIMIT` - Monthly bid limit (5/20/100/unlimited)
- `CONTRACTOR_DISCOVERY_CARD` - Discovery feed (Basic+)
- `CONTRACTOR_SOCIAL_FEED` - Social feed (Professional+)
- `CONTRACTOR_ADVANCED_ANALYTICS` - Advanced analytics (Professional+)
- `CONTRACTOR_API_ACCESS` - API access (Enterprise)
- And more...

## Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| Trial | £0 (14 days) | Limited features |
| Basic | £29/month | Essential features |
| Professional | £79/month | Advanced features |
| Enterprise | £199/month | Complete solution |

## Components API

### FeatureGate

```typescript
<FeatureGate
  featureId="FEATURE_ID"           // Required
  mode="modal"                     // 'modal' | 'banner' | 'hide'
  trackUsage={false}               // Track usage on access
  onUpgrade={(tier) => {}}         // Custom upgrade handler
  onAccessDenied={(result) => {}}  // Access denied callback
  fallback={<CustomFallback />}    // Custom fallback UI
>
  <ProtectedContent />
</FeatureGate>
```

### FeatureButton

```typescript
<FeatureButton
  featureId="FEATURE_ID"
  trackUsage={true}
  onClick={handleClick}
  // ...all standard button props
>
  Click Me
</FeatureButton>
```

### useFeatureAccess Hook

```typescript
const {
  hasAccess,              // Check feature access
  trackUsage,             // Track usage
  getRemainingUsage,      // Get remaining quota
  tier,                   // Current tier
  loading,                // Loading state
} = useFeatureAccess();
```

## Documentation

- **[Full Documentation](../../../../docs/FEATURE_ACCESS_SYSTEM.md)** - Complete system guide
- **[Quick Start](../../../../docs/FEATURE_ACCESS_QUICK_START.md)** - Quick reference
- **[Examples](../../components/examples/FeatureAccessExamples.tsx)** - Integration examples

## Database Setup

Run the migration:
```bash
npx supabase migration up
```

## File Structure

```
lib/feature-access/
├── index.ts                    # Central exports
└── README.md                   # This file

lib/
└── feature-access-config.ts    # Feature definitions

hooks/
└── useFeatureAccess.ts         # React hook

components/ui/
├── FeatureGate.tsx             # Gate components
└── Paywall.tsx                 # Paywall UI
```

## Support

- Check the [documentation](../../../../docs/FEATURE_ACCESS_SYSTEM.md)
- Review [examples](../../components/examples/FeatureAccessExamples.tsx)
- Contact the development team
