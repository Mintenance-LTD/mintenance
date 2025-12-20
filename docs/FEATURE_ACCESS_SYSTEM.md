# Feature Access System

A comprehensive feature access matrix and paywall system for the Mintenance platform.

## Overview

The Feature Access System provides a complete solution for managing feature access across different subscription tiers, tracking usage of metered features, and presenting beautiful upgrade prompts to users.

## Subscription Tiers

### Homeowners
**All features are FREE for homeowners.**

Homeowners can:
- Post unlimited jobs
- Message contractors
- Video calls
- AI building assessments
- And more...

### Contractors

| Tier | Price | Description |
|------|-------|-------------|
| **Free** | £0 | Forever free - 5 bids/month (renewable monthly) |
| **Basic** | £29/month | 20 bids/month - Enhanced profile & features |
| **Professional** | £79/month | 100 bids/month - Advanced tools & analytics |
| **Enterprise** | £199/month | Unlimited bids - Full platform access |

## Architecture

### Components

```
apps/web/lib/feature-access-config.ts    - Feature definitions and limits
apps/web/hooks/useFeatureAccess.ts       - React hook for feature access
apps/web/components/ui/Paywall.tsx       - Beautiful paywall modal
apps/web/components/ui/FeatureGate.tsx   - Feature gating components
apps/mobile/src/utils/featureAccess.ts   - Mobile implementation
```

### Database

- **contractor_subscriptions** - Stores subscription information
- **feature_usage** - Tracks metered feature usage
- **subscription_features** - Feature limits per tier

## Usage Examples

### 1. Basic Feature Gate (Modal)

Wrap any component to require feature access. Shows a modal paywall if user doesn't have access.

```tsx
import { FeatureGate } from '@/components/ui/FeatureGate';

export function ContractorSocialPage() {
  return (
    <FeatureGate featureId="CONTRACTOR_SOCIAL_FEED">
      <ContractorSocialFeed />
    </FeatureGate>
  );
}
```

### 2. Banner Mode (Inline)

Show an inline upgrade banner instead of a modal.

```tsx
<FeatureGate
  featureId="CONTRACTOR_ADVANCED_ANALYTICS"
  mode="banner"
>
  <AdvancedAnalyticsChart />
</FeatureGate>
```

### 3. Hide Mode (No UI)

Simply hide the content without showing any paywall UI.

```tsx
<FeatureGate
  featureId="CONTRACTOR_API_ACCESS"
  mode="hide"
>
  <APIDocumentation />
</FeatureGate>
```

### 4. With Usage Tracking

Automatically track usage when feature is accessed (for metered features like bids).

```tsx
<FeatureGate
  featureId="CONTRACTOR_BID_LIMIT"
  trackUsage={true}
>
  <BidSubmissionForm />
</FeatureGate>
```

### 5. Feature Button

A button that checks access before executing an action.

```tsx
import { FeatureButton } from '@/components/ui/FeatureGate';

export function BidForm() {
  const handleSubmit = async () => {
    // This only runs if user has access
    await submitBid();
  };

  return (
    <FeatureButton
      featureId="CONTRACTOR_BID_LIMIT"
      trackUsage={true}
      onClick={handleSubmit}
      className="btn-primary"
    >
      Submit Bid
    </FeatureButton>
  );
}
```

### 6. Feature Badge

Show a badge indicating feature availability.

```tsx
import { FeatureBadge } from '@/components/ui/FeatureGate';

export function FeatureList() {
  return (
    <div>
      <h3>
        Social Feed
        <FeatureBadge featureId="CONTRACTOR_SOCIAL_FEED" />
      </h3>
    </div>
  );
}
```

### 7. Using the Hook Directly

For more control, use the `useFeatureAccess` hook directly.

```tsx
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export function BidCounter() {
  const { hasAccess, getRemainingUsage, tier } = useFeatureAccess();

  const result = hasAccess('CONTRACTOR_BID_LIMIT');
  const remaining = getRemainingUsage('CONTRACTOR_BID_LIMIT');

  return (
    <div>
      <p>Current Plan: {tier}</p>
      {result.hasAccess ? (
        <p>Bids Remaining: {remaining === 'unlimited' ? '∞' : remaining}</p>
      ) : (
        <p>Upgrade to submit bids</p>
      )}
    </div>
  );
}
```

### 8. Programmatic Access Check

Check access and handle logic programmatically.

```tsx
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useState } from 'react';
import { Paywall } from '@/components/ui/Paywall';

export function PublishArticle() {
  const { hasAccess, trackUsage } = useFeatureAccess();
  const [showPaywall, setShowPaywall] = useState(false);

  const handlePublish = async () => {
    const result = hasAccess('CONTRACTOR_PUBLISH_ARTICLES');

    if (!result.hasAccess) {
      setShowPaywall(true);
      return;
    }

    // Track usage
    await trackUsage('CONTRACTOR_PUBLISH_ARTICLES');

    // Proceed with publishing
    await publishArticle();
  };

  return (
    <>
      <button onClick={handlePublish}>
        Publish Article
      </button>

      {result.feature && (
        <Paywall
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          feature={result.feature}
          currentTier={tier}
          upgradeTiers={result.upgradeTiers}
        />
      )}
    </>
  );
}
```

### 9. Higher-Order Component

Wrap components with feature access using HOC pattern.

```tsx
import { withFeatureAccess } from '@/components/ui/FeatureGate';

const ProtectedComponent = ({ data }) => {
  return <div>Protected content: {data}</div>;
};

// Wrap with feature access
export const SocialFeed = withFeatureAccess(
  ProtectedComponent,
  'CONTRACTOR_SOCIAL_FEED',
  { mode: 'banner' }
);
```

### 10. Conditional Rendering

Conditionally render different UIs based on access.

```tsx
import { useFeature } from '@/hooks/useFeatureAccess';

export function AnalyticsDashboard() {
  const { hasAccess, loading } = useFeature('CONTRACTOR_ADVANCED_ANALYTICS');

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {hasAccess ? (
        <AdvancedAnalytics />
      ) : (
        <BasicAnalytics />
      )}
    </div>
  );
}
```

## Mobile Usage (React Native)

### Initialize Feature Access

```typescript
import { featureAccess } from '@/utils/featureAccess';

// In your app initialization
useEffect(() => {
  if (user) {
    featureAccess.initialize(user.id, user.role);
  }
}, [user]);
```

### Check Access

```typescript
import { featureAccess, canPerformAction } from '@/utils/featureAccess';

// Simple check
const hasAccess = featureAccess.hasAccess('CONTRACTOR_BID_LIMIT', user.role);

// With message
const { allowed, message } = await canPerformAction(
  user.id,
  user.role,
  'CONTRACTOR_BID_LIMIT'
);

if (!allowed) {
  Alert.alert('Upgrade Required', message);
}
```

### Track Usage

```typescript
// Track usage before action
const tracked = await featureAccess.trackUsage(
  user.id,
  'CONTRACTOR_BID_LIMIT'
);

if (tracked) {
  // Proceed with action
  submitBid();
} else {
  // Show upgrade prompt
  showUpgradeAlert();
}
```

### Get Remaining Usage

```typescript
const remaining = featureAccess.getRemainingUsage('CONTRACTOR_BID_LIMIT');

// Display to user
<Text>
  Bids Remaining: {remaining === 'unlimited' ? '∞' : remaining}
</Text>
```

## Feature Configuration

### Adding a New Feature

1. Add feature definition to `apps/web/lib/feature-access-config.ts`:

```typescript
export const FEATURES = {
  // ... existing features

  MY_NEW_FEATURE: {
    id: 'MY_NEW_FEATURE',
    name: 'New Feature',
    description: 'Description of the feature',
    category: 'Business Tools',
    limits: {
      trial: false,
      basic: true,
      professional: true,
      enterprise: true,
    },
    upgradeMessage: 'Upgrade to access this feature.',
  },
};
```

2. Use the feature in your components:

```tsx
<FeatureGate featureId="MY_NEW_FEATURE">
  <MyNewComponent />
</FeatureGate>
```

### Feature Limit Types

Features can have different types of limits:

**Boolean Access:**
```typescript
limits: {
  trial: false,    // No access
  basic: true,     // Full access
  professional: true,
  enterprise: true,
}
```

**Numeric Limits (Metered):**
```typescript
limits: {
  trial: 5,        // Limited to 5 per month
  basic: 20,       // Limited to 20 per month
  professional: 100,
  enterprise: 'unlimited', // Unlimited access
}
```

**Homeowner Features:**
```typescript
limits: {
  homeowner: true, // Available to all homeowners
}
```

## Paywall Customization

### Custom Upgrade Handler

```tsx
<FeatureGate
  featureId="CONTRACTOR_SOCIAL_FEED"
  onUpgrade={(tier) => {
    // Custom upgrade logic
    analytics.track('Upgrade Clicked', { tier });
    router.push(`/contractor/subscription?plan=${tier}`);
  }}
>
  <SocialFeed />
</FeatureGate>
```

### Custom Fallback

```tsx
<FeatureGate
  featureId="CONTRACTOR_ADVANCED_ANALYTICS"
  fallback={
    <div className="p-8 text-center">
      <h3>Upgrade to Professional</h3>
      <p>Get advanced analytics and insights</p>
      <button>Learn More</button>
    </div>
  }
>
  <AdvancedAnalytics />
</FeatureGate>
```

### Custom Loading State

```tsx
<FeatureGate
  featureId="CONTRACTOR_CRM"
  loadingComponent={<CustomLoadingSpinner />}
>
  <CRMDashboard />
</FeatureGate>
```

## Database Management

### Run Migration

```bash
npx supabase db diff --local
npx supabase migration up
```

### Reset Usage (Manual)

```sql
-- Reset all expired usage records
SELECT public.reset_feature_usage();
```

### Get Usage Summary

```sql
-- Get usage summary for a user
SELECT * FROM public.get_feature_usage_summary('user-id-here');
```

### Check User's Subscription

```sql
-- Check subscription tier
SELECT plan_type, status
FROM contractor_subscriptions
WHERE contractor_id = 'user-id-here'
  AND status IN ('trial', 'active')
ORDER BY created_at DESC
LIMIT 1;
```

## Analytics Integration

Track paywall views and upgrade conversions:

```tsx
<FeatureGate
  featureId="CONTRACTOR_SOCIAL_FEED"
  onAccessDenied={(result) => {
    analytics.track('Paywall Viewed', {
      feature: result.feature?.name,
      currentTier: tier,
      upgradeTiers: result.upgradeTiers,
    });
  }}
  onUpgrade={(tier) => {
    analytics.track('Upgrade Initiated', {
      targetTier: tier,
      feature: 'CONTRACTOR_SOCIAL_FEED',
    });
  }}
>
  <SocialFeed />
</FeatureGate>
```

## Best Practices

### 1. Always Use FeatureGate for Protected Features

```tsx
// ✅ Good
<FeatureGate featureId="CONTRACTOR_SOCIAL_FEED">
  <SocialFeed />
</FeatureGate>

// ❌ Bad - No protection
<SocialFeed />
```

### 2. Track Usage for Metered Features

```tsx
// ✅ Good - Tracks usage automatically
<FeatureGate
  featureId="CONTRACTOR_BID_LIMIT"
  trackUsage={true}
>
  <BidForm />
</FeatureGate>

// ❌ Bad - No tracking
<FeatureGate featureId="CONTRACTOR_BID_LIMIT">
  <BidForm />
</FeatureGate>
```

### 3. Use Appropriate Display Modes

```tsx
// ✅ Modal for primary features
<FeatureGate featureId="CONTRACTOR_SOCIAL_FEED" mode="modal">

// ✅ Banner for supplementary features
<FeatureGate featureId="CONTRACTOR_ADVANCED_ANALYTICS" mode="banner">

// ✅ Hide for admin-only features
<FeatureGate featureId="CONTRACTOR_API_ACCESS" mode="hide">
```

### 4. Provide Clear Upgrade Messages

```typescript
// ✅ Good - Clear, value-focused message
{
  upgradeMessage: 'Upgrade to Professional to join the contractor community and network with peers.',
}

// ❌ Bad - Generic message
{
  upgradeMessage: 'This feature is not available.',
}
```

### 5. Handle Loading States

```tsx
const { loading, hasAccess } = useFeature('CONTRACTOR_SOCIAL_FEED');

if (loading) {
  return <LoadingSpinner />;
}
```

## Troubleshooting

### Issue: Paywall not showing

**Solution:** Check that the feature ID is correctly spelled and exists in the config.

```typescript
// Check feature exists
const feature = FEATURES['CONTRACTOR_SOCIAL_FEED'];
console.log(feature); // Should not be undefined
```

### Issue: Usage tracking not working

**Solution:** Ensure the database migration has been run and the RPC function exists.

```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'increment_feature_usage';
```

### Issue: User has wrong tier

**Solution:** Check subscription status in database.

```sql
SELECT * FROM contractor_subscriptions
WHERE contractor_id = 'user-id'
ORDER BY created_at DESC;
```

## Testing

### Test Feature Access

```typescript
import { hasFeatureAccess } from '@/lib/feature-access-config';

describe('Feature Access', () => {
  it('allows basic tier to access discovery card', () => {
    const result = hasFeatureAccess(
      'CONTRACTOR_DISCOVERY_CARD',
      'contractor',
      'basic'
    );
    expect(result).toBe(true);
  });

  it('denies trial access to social feed', () => {
    const result = hasFeatureAccess(
      'CONTRACTOR_SOCIAL_FEED',
      'contractor',
      'trial'
    );
    expect(result).toBe(false);
  });
});
```

## Performance Considerations

1. **Caching:** Feature access checks are cached in the hook state
2. **Usage Tracking:** Only tracked when `trackUsage={true}`
3. **Database Queries:** Optimized with proper indexes
4. **RLS Policies:** Secure but may add slight overhead

## Security

- **Row Level Security (RLS)** enabled on all tables
- **Users can only view/modify their own usage data**
- **Service role** required for administrative operations
- **Secure Functions** use `SECURITY DEFINER` to run with elevated privileges

## Future Enhancements

- [ ] A/B testing for paywall copy
- [ ] Dynamic pricing based on user behavior
- [ ] Grace periods for expired trials
- [ ] Usage notifications (80%, 90%, 100%)
- [ ] Bulk operations for enterprise
- [ ] Custom feature bundles
- [ ] Seasonal promotions

## Support

For questions or issues:
- Check the documentation above
- Review the code comments
- Contact the development team
