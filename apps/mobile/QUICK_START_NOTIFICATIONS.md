# 🚀 Quick Start: Background Notifications

## 30-Second Integration

### 1. App.tsx - Add to your useEffect

```typescript
import { NotificationService } from './src/services/NotificationService';
import { supabase } from './src/config/supabase';

useEffect(() => {
  const init = async () => {
    const token = await NotificationService.initialize();
    if (token) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await NotificationService.savePushToken(user.id, token);
    }
    NotificationService.setupNotificationListeners();
  };
  init();
  return () => NotificationService.cleanup();
}, []);
```

### 2. RootNavigator.tsx - Add navigation reference

```typescript
import { useNavigationContainerRef } from '@react-navigation/native';
import { NotificationService } from '../services/NotificationService';

const navigationRef = useNavigationContainerRef();

useEffect(() => {
  if (navigationRef?.current) {
    NotificationService.setNavigationRef(navigationRef.current as any);
  }
}, [navigationRef]);

// Then in your NavigationContainer:
<NavigationContainer ref={navigationRef}>
  {/* your navigation */}
</NavigationContainer>
```

### 3. Test It!

```typescript
// Send test notification
import * as Notifications from 'expo-notifications';

await Notifications.scheduleNotificationAsync({
  content: {
    title: "Test!",
    body: "Background notifications working",
    data: { type: 'system' }
  },
  trigger: null
});
```

## ✅ That's It!

Your app now supports:
- ✅ Foreground notifications
- ✅ Background notifications
- ✅ Tap to navigate (deep linking)
- ✅ Badge count updates
- ✅ Notification queue
- ✅ Offline support

## 📖 Full Documentation

- **Integration Guide**: `NotificationServiceIntegration.md`
- **Code Examples**: `NotificationServiceExample.tsx`
- **Flow Diagrams**: `NOTIFICATION_FLOW_DIAGRAM.md`
- **Summary**: `NOTIFICATION_IMPLEMENTATION_SUMMARY.md`

## 🧪 Test Scenarios

### Kill App Test
1. Close app completely
2. Send notification via Expo Push Tool
3. Tap notification
4. App should launch directly to correct screen ✅

### Background Test
1. Open app, then minimize
2. Send notification
3. Tap notification
4. App should navigate to correct screen ✅

### Foreground Test
1. Keep app open
2. Send notification
3. Banner appears, tap it
4. Navigates to correct screen ✅

## 🎯 Notification Data Format

```json
{
  "title": "New Bid Received",
  "body": "John bid £500 on your plumbing job",
  "data": {
    "type": "bid_received",
    "jobId": "job-uuid-123",
    "contractorId": "contractor-uuid-456",
    "bidAmount": 500,
    "notificationId": "notif-uuid-789"
  }
}
```

## 🔗 Deep Link Routes

| Type | Goes To |
|------|---------|
| `job_update` | Job Details |
| `bid_received` | Job Details |
| `message_received` | Chat Screen |
| `meeting_scheduled` | Meeting Details |
| `payment_received` | Job Details |
| `quote_sent` | Job Details |
| `system` | Home |

## 🐛 Troubleshooting

**No notifications?**
- Check permissions: `Notifications.getPermissionsAsync()`
- Use physical device (not simulator)

**Navigation not working?**
- Verify navigation ref is set (check logs)
- Ensure notification data has required IDs

**Badge not updating?**
- Check user is authenticated
- Verify RLS policies on `notifications` table

## 📞 Need Help?

1. Check the logs: `logger.info/error` statements throughout
2. Read full docs: `NotificationServiceIntegration.md`
3. See examples: `NotificationServiceExample.tsx`

---

**Status**: ✅ Ready to use
**Version**: 1.0.0
**Last Updated**: 2025-12-22
