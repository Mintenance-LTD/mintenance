# 📚 SERVICE MIGRATION GUIDE - Moving to Shared Services

**Status:** Ready for Migration
**Estimated Time:** 2-4 hours per app

---

## 🎯 OVERVIEW

This guide helps you migrate from duplicated local services to the new shared services package (`@mintenance/services`). The shared services are now installed in both apps and ready to use.

---

## 📦 WHAT'S AVAILABLE

### Shared Services Package Structure
```
packages/services/
├── AuthService      ✅ Complete (login, signup, sessions, roles)
├── PaymentService   ✅ Complete (payments, escrow, fees)
├── NotificationService ✅ Complete (multi-channel notifications)
├── JobService       🔄 TODO
└── UserService      🔄 TODO
```

### Integration Files Created
- **Web:** `apps/web/lib/services-v2/index.ts`
- **Mobile:** `apps/mobile/src/services-v2/index.ts`

---

## 🔄 MIGRATION STEPS

### Step 1: Import New Services

#### Web App
```typescript
// OLD - Local service
import { PaymentService } from '@/lib/services/PaymentService';

// NEW - Shared service
import { paymentService } from '@/lib/services-v2';
```

#### Mobile App
```typescript
// OLD - Local service
import { PaymentService } from '../services/PaymentService';

// NEW - Shared service
import { paymentService } from '../services-v2';
```

### Step 2: Update Method Calls

Most methods remain the same, but note these changes:

#### Authentication
```typescript
// OLD
const result = await AuthService.login(email, password);

// NEW
const user = await authService.login({ email, password });
```

#### Payments
```typescript
// OLD
const { clientSecret } = await PaymentService.createPaymentIntent(jobId, amount);

// NEW
const intent = await paymentService.createPaymentIntent({
  jobId,
  amount,
  contractorId: 'optional-contractor-id'
});
const clientSecret = intent.client_secret;
```

#### Notifications
```typescript
// OLD - Different in each app
await NotificationService.sendNotification(userId, title, message);

// NEW - Unified interface
await notificationService.send({
  userId,
  type: 'job_posted',
  title,
  message,
  channels: ['push', 'in_app']
});
```

---

## 🔌 PLATFORM-SPECIFIC FEATURES

### Web-Specific (OAuth)
```typescript
import { webAuthService } from '@/lib/services-v2';

// OAuth login (web only)
await webAuthService.loginWithGoogle();
await webAuthService.loginWithGitHub();
```

### Mobile-Specific (Biometric, Push)
```typescript
import { mobileAuthService, mobileNotificationService } from '../services-v2';

// Biometric auth (mobile only)
const authenticated = await mobileAuthService.authenticateWithBiometric();

// Push notifications (mobile only)
const pushToken = await mobileNotificationService.registerForPushNotifications();
```

---

## 📝 MIGRATION CHECKLIST

### For Each Service:

#### AuthService
- [ ] Update login/signup calls
- [ ] Update session management
- [ ] Update role checking
- [ ] Test password reset flow
- [ ] Test token refresh

#### PaymentService
- [ ] Update payment intent creation
- [ ] Update payment method management
- [ ] Update escrow functions
- [ ] Test fee calculations
- [ ] Verify webhook handling

#### NotificationService
- [ ] Update send notification calls
- [ ] Update preference management
- [ ] Update notification fetching
- [ ] Test push notifications (mobile)
- [ ] Test email notifications

---

## 🚀 MIGRATION EXAMPLE

### Before (Duplicated Service)
```typescript
// apps/mobile/src/screens/PaymentScreen.tsx
import { PaymentService } from '../services/PaymentService';

const handlePayment = async () => {
  try {
    const response = await PaymentService.createPaymentIntent(
      job.id,
      job.budget,
      selectedPaymentMethod
    );

    if (response.error) {
      showError(response.error);
      return;
    }

    await confirmPayment(response.clientSecret);
  } catch (error) {
    console.error(error);
  }
};
```

### After (Shared Service)
```typescript
// apps/mobile/src/screens/PaymentScreen.tsx
import { paymentService } from '../services-v2';

const handlePayment = async () => {
  try {
    const intent = await paymentService.createPaymentIntent({
      jobId: job.id,
      amount: job.budget,
      paymentMethodId: selectedPaymentMethod,
      contractorId: job.contractor_id
    });

    await confirmPayment(intent.client_secret);
  } catch (error) {
    // Error is already formatted by service
    showError(error.message);
  }
};
```

---

## ⚠️ BREAKING CHANGES

### 1. Error Handling
- **Old:** Errors returned in response object
- **New:** Errors thrown as exceptions (try/catch)

### 2. Response Format
- **Old:** `{ data?, error? }` pattern
- **New:** Direct return of data, errors thrown

### 3. Static vs Instance Methods
- **Old:** Static methods (`PaymentService.createIntent()`)
- **New:** Instance methods (`paymentService.createIntent()`)

---

## 🧪 TESTING STRATEGY

### 1. Parallel Testing
During migration, keep both services available:
```typescript
// Temporarily import both
import { PaymentService as OldPaymentService } from '../services/PaymentService';
import { paymentService as NewPaymentService } from '../services-v2';

// Compare results
const oldResult = await OldPaymentService.createIntent(params);
const newResult = await NewPaymentService.createIntent(params);
console.log('Results match:', deepEqual(oldResult, newResult));
```

### 2. Feature Flag
Use feature flags for gradual rollout:
```typescript
const useNewServices = process.env.NEXT_PUBLIC_USE_NEW_SERVICES === 'true';

const paymentService = useNewServices
  ? require('@/lib/services-v2').paymentService
  : require('@/lib/services/PaymentService').PaymentService;
```

### 3. Integration Tests
Run existing tests against new services:
```bash
# Update test imports to use new services
npm test -- --grep "payment"
npm test -- --grep "auth"
npm test -- --grep "notification"
```

---

## 📊 BENEFITS AFTER MIGRATION

### Code Reduction
- **Before:** ~400 service files across both apps
- **After:** 4 shared services + minimal wrappers
- **Savings:** ~50% less code

### Maintenance
- **Before:** Fix bugs in 2 places
- **After:** Fix once, works everywhere
- **Savings:** 50% less maintenance

### Type Safety
- **Before:** Inconsistent types between apps
- **After:** Single source of truth
- **Result:** No runtime type errors

### Features
- **Before:** Features implemented differently
- **After:** Consistent behavior
- **Result:** Better user experience

---

## 🔧 TROUBLESHOOTING

### Issue: Module not found
```bash
# Rebuild the services package
cd packages/services && npm run build
```

### Issue: Type errors
```bash
# Ensure types package is built
cd packages/types && npm run build
```

### Issue: Supabase client errors
```typescript
// Ensure Supabase client is initialized
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

---

## 🎯 NEXT STEPS

1. **Start Small:** Migrate one screen/component at a time
2. **Test Thoroughly:** Run tests after each migration
3. **Monitor:** Watch error logs during rollout
4. **Document:** Note any issues or workarounds
5. **Clean Up:** Remove old services once migration complete

---

## 📅 SUGGESTED TIMELINE

### Week 1
- Day 1-2: Migrate AuthService usage
- Day 3-4: Migrate PaymentService usage
- Day 5: Test and fix issues

### Week 2
- Day 1-2: Migrate NotificationService usage
- Day 3: Complete JobService in shared package
- Day 4-5: Migrate JobService usage

### Week 3
- Day 1-2: Remove old service files
- Day 3-4: Full integration testing
- Day 5: Documentation and cleanup

---

**Remember:** The goal is to have ONE implementation of each service that both apps use. This ensures consistency, reduces bugs, and makes maintenance much easier.