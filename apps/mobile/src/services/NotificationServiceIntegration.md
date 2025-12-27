# NotificationService Background Handler Integration Guide

## Overview
The NotificationService now includes comprehensive background notification handling with:
- ✅ Background notification handler (foreground, background, and killed states)
- ✅ Deep linking to relevant screens based on notification type
- ✅ Notification queue for offline/delayed processing
- ✅ Automatic badge count updates
- ✅ Platform-specific sound/vibration handling
- ✅ Proper cleanup methods

## Integration Steps

### 1. Update App.tsx

Add notification initialization to your App.tsx:

```typescript
import { NotificationService } from './src/services/NotificationService';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Initialize notification listeners on app start
    const initNotifications = async () => {
      try {
        // Request permissions and get token
        const token = await NotificationService.initialize();

        if (token) {
          // Get user and save token
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await NotificationService.savePushToken(user.id, token);
          }
        }

        // Set up listeners for all app states
        NotificationService.setupNotificationListeners();

        logger.info('Notifications initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize notifications', error);
      }
    };

    initNotifications();

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup();
    };
  }, []);

  // Rest of your app...
}
```

### 2. Update RootNavigator.tsx

Pass the navigation reference to NotificationService:

```typescript
import { NotificationService } from '../services/NotificationService';
import { useNavigationContainerRef } from '@react-navigation/native';

export const RootNavigator: React.FC = () => {
  const navigationRef = useNavigationContainerRef();
  const { user, loading } = useAuth();

  // Set navigation reference for deep linking
  useEffect(() => {
    if (navigationRef?.current) {
      NotificationService.setNavigationRef(navigationRef.current as any);
    }
  }, [navigationRef]);

  return (
    <AppErrorBoundary>
      <NavigationContainer ref={navigationRef}>
        {/* Your navigation structure */}
      </NavigationContainer>
    </AppErrorBoundary>
  );
};
```

### 3. Handle Badge Count Updates

In your main authenticated screen or AuthContext:

```typescript
import { NotificationService } from '../services/NotificationService';
import { useFocusEffect } from '@react-navigation/native';

export const HomeScreen = () => {
  // Update badge count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const updateBadge = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const count = await NotificationService.getUnreadCount(user.id);
          await Notifications.setBadgeCountAsync(count);
        }
      };

      updateBadge();
    }, [])
  );

  // Rest of component...
};
```

### 4. Mark Notifications as Read

When user views a notification:

```typescript
// In your notification list or detail screen
const handleNotificationPress = async (notificationId: string) => {
  await NotificationService.markAsRead(notificationId);
  // Navigate to relevant content
};

// Mark all as read button
const handleMarkAllRead = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await NotificationService.markAllAsRead(user.id);
  }
};
```

### 5. Clear Notifications on Logout

In your logout handler:

```typescript
const handleLogout = async () => {
  try {
    // Clear all notifications
    await NotificationService.clearAllNotifications();

    // Cleanup listeners
    NotificationService.cleanup();

    // Perform logout
    await supabase.auth.signOut();

    // Navigate to auth screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  } catch (error) {
    logger.error('Logout failed', error);
  }
};
```

## Notification Data Structure

When sending notifications from your backend, use this structure:

```typescript
{
  title: "New Bid Received",
  body: "John submitted a bid for your plumbing job",
  data: {
    type: "bid_received",           // Required for deep linking
    priority: "high",               // 'low' | 'normal' | 'high'
    notificationId: "uuid",         // For marking as read
    jobId: "job-uuid",              // For navigation
    // Additional data based on type:
    contractorId?: "contractor-uuid",
    bidAmount?: 500,
    // etc.
  }
}
```

## Supported Notification Types & Deep Links

| Type | Deep Link Destination | Required Data |
|------|----------------------|---------------|
| `job_update` | JobsTab → JobDetails | `jobId` |
| `bid_received` | JobsTab → JobDetails | `jobId` |
| `message_received` | MessagingTab → Messaging | `conversationId`, `senderId`, `senderName` |
| `meeting_scheduled` | Modal → MeetingDetails | `meetingId` |
| `payment_received` | JobsTab → JobDetails | `jobId` |
| `quote_sent` | JobsTab → JobDetails | `jobId` |
| `system` | HomeTab | none |

## Testing Background Notifications

### Test in Development:

```bash
# Install Expo CLI
npm install -g expo-cli

# Send test notification
expo push:android:upload --id YOUR_EXPO_TOKEN

# Or use the Expo Push Notification Tool:
# https://expo.dev/notifications
```

### Test Scenarios:

1. **Foreground**: App is open and active
   - ✅ Notification banner appears
   - ✅ Sound plays
   - ✅ Badge count updates
   - ✅ Tap navigates correctly

2. **Background**: App is running but not visible
   - ✅ Notification appears in tray
   - ✅ Sound/vibration works
   - ✅ Badge count updates
   - ✅ Tap opens app and navigates

3. **Killed**: App is completely closed
   - ✅ Notification appears in tray
   - ✅ Sound/vibration works
   - ✅ Badge count updates
   - ✅ Tap launches app and navigates

4. **Offline**: No internet connection
   - ✅ Notifications queue for processing
   - ✅ Process when app reopens with internet
   - ✅ Badge count syncs when online

## Troubleshooting

### Notifications not appearing?
- Check permissions: `await Notifications.getPermissionsAsync()`
- Verify push token is saved: Check `user_push_tokens` table
- Test device is physical (not simulator for iOS)
- Check Firebase/Expo console for delivery errors

### Deep linking not working?
- Verify `navigationRef` is set: Check logs for "Navigation reference set"
- Ensure navigation structure matches the deep link paths
- Check notification data includes required fields (jobId, etc.)
- Add logging in `getDeepLinkParams()` to debug

### Badge count not updating?
- Verify user is authenticated when calling `updateBadgeCount()`
- Check `notifications` table has correct `read` status
- iOS: Verify permissions include badge access
- Android: Check notification channel settings

### Queue not processing?
- Check AsyncStorage permissions
- Verify `loadNotificationQueue()` is called on app start
- Check logs for "Processing queued notifications"
- Clear old queue: `await AsyncStorage.removeItem('@mintenance/notification_queue')`

## Advanced Usage

### Custom Vibration Patterns

Edit the Android channel configuration in `initialize()`:

```typescript
await Notifications.setNotificationChannelAsync('urgent', {
  name: 'Urgent Notifications',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250, 250, 250], // Longer vibration
  lightColor: '#FF0000',
  sound: 'urgent_sound.wav', // Custom sound file
});
```

### Notification Actions (iOS)

Add interactive actions to notifications:

```typescript
await Notifications.setNotificationCategoryAsync('bid', [
  {
    identifier: 'accept',
    buttonTitle: 'Accept Bid',
    options: {
      opensAppToForeground: true,
    },
  },
  {
    identifier: 'view',
    buttonTitle: 'View Details',
    options: {
      opensAppToForeground: true,
    },
  },
]);
```

### Analytics Integration

Track notification interactions:

```typescript
// In handleNotificationResponse
await analytics.logEvent('notification_tapped', {
  type: type,
  screen: deepLinkParams.screen,
  userId: user?.id,
  timestamp: new Date().toISOString(),
});
```

## Best Practices

1. **Always handle null navigation**: Wait for navigation to be ready
2. **Queue aggressively**: Better to queue than lose notifications
3. **Update badge frequently**: After any notification interaction
4. **Log everything**: Notifications are hard to debug without logs
5. **Test on real devices**: Simulators have limited notification support
6. **Respect user preferences**: Check quiet hours and notification settings
7. **Clean up on logout**: Remove listeners and clear queue

## API Reference

See the NotificationService class for full API documentation. Key methods:

- `initialize()`: Request permissions and get push token
- `setupNotificationListeners()`: Set up foreground/background handlers
- `setNavigationRef()`: Enable deep linking
- `updateBadgeCount()`: Sync badge with unread count
- `clearAllNotifications()`: Clear all notifications and queue
- `cleanup()`: Remove listeners (call on logout/unmount)
