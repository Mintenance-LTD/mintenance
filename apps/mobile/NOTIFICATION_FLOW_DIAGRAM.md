# Notification Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION LIFECYCLE                        │
└─────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║  1. INITIALIZATION (App Start)                                 ║
╚═══════════════════════════════════════════════════════════════╝

    App.tsx
      │
      ├─► NotificationService.initialize()
      │     ├─► Request permissions
      │     ├─► Get Expo push token
      │     └─► Save token to database
      │
      ├─► NotificationService.setupNotificationListeners()
      │     ├─► addNotificationReceivedListener (foreground)
      │     ├─► addNotificationResponseReceivedListener (tap)
      │     └─► processLastNotificationResponse() (killed state)
      │
      └─► RootNavigator
            └─► NotificationService.setNavigationRef(navRef)


╔═══════════════════════════════════════════════════════════════╗
║  2. RECEIVING NOTIFICATIONS                                    ║
╚═══════════════════════════════════════════════════════════════╝

    Push Notification Server (Expo)
      │
      ▼
    ┌─────────────────────────────────────────────────┐
    │  Notification Handler (setNotificationHandler)  │
    │  • Determines if should show alert              │
    │  • Configures sound (based on priority)         │
    │  • Sets badge flag                              │
    └─────────────────────────────────────────────────┘
      │
      ▼
    ┌─────────────────────────────────────────────────┐
    │           APP STATE: FOREGROUND                 │
    ├─────────────────────────────────────────────────┤
    │  addNotificationReceivedListener()              │
    │    ├─► queueNotification() → AsyncStorage       │
    │    └─► updateBadgeCount()                       │
    └─────────────────────────────────────────────────┘
      │
      ▼
    ┌─────────────────────────────────────────────────┐
    │       APP STATE: BACKGROUND / KILLED            │
    ├─────────────────────────────────────────────────┤
    │  • Notification appears in system tray          │
    │  • Sound/vibration based on channel             │
    │  • Badge count increments                       │
    │  • Queued for processing on tap                 │
    └─────────────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════╗
║  3. USER TAPS NOTIFICATION                                     ║
╚═══════════════════════════════════════════════════════════════╝

    User Taps Notification
      │
      ▼
    addNotificationResponseReceivedListener()
      │
      ├─► Extract notification data (type, jobId, etc.)
      │
      ├─► markAsRead(notificationId) → Supabase
      │
      ├─► handleNotificationResponse()
      │     │
      │     ├─► Wait for navigation ready (if needed)
      │     │
      │     ├─► getDeepLinkParams(type, data)
      │     │     │
      │     │     ├─► job_update      → Main/JobsTab/JobDetails
      │     │     ├─► bid_received    → Main/JobsTab/JobDetails
      │     │     ├─► message_received → Main/MessagingTab/Messaging
      │     │     ├─► meeting_scheduled → Modal/MeetingDetails
      │     │     ├─► payment_received → Main/JobsTab/JobDetails
      │     │     ├─► quote_sent      → Main/JobsTab/JobDetails
      │     │     └─► system          → Main/HomeTab
      │     │
      │     └─► navigationRef.navigate(screen, params)
      │
      └─► updateBadgeCount() → Decrements badge


╔═══════════════════════════════════════════════════════════════╗
║  4. QUEUE MANAGEMENT                                           ║
╚═══════════════════════════════════════════════════════════════╝

    Notification Arrives
      │
      ▼
    queueNotification()
      │
      ├─► Create QueuedNotification object
      ├─► Add to in-memory queue
      ├─► Persist to AsyncStorage
      └─► Save last notification ID

    App Restart/Reopen
      │
      ▼
    loadNotificationQueue()
      │
      ├─► Read from AsyncStorage
      ├─► Load into memory
      └─► processQueue()
            │
            ├─► Mark unprocessed as processed
            ├─► Log for analytics
            └─► Cleanup old (keep last 50)


╔═══════════════════════════════════════════════════════════════╗
║  5. BADGE COUNT MANAGEMENT                                     ║
╚═══════════════════════════════════════════════════════════════╝

    Trigger Events:
    • Notification received
    • Notification tapped
    • Screen focused
    • Mark as read
    • Mark all as read
      │
      ▼
    updateBadgeCount()
      │
      ├─► supabase.auth.getUser()
      │
      ├─► getUnreadCount(userId)
      │     └─► Query notifications table (read = false)
      │
      └─► Notifications.setBadgeCountAsync(count)
            └─► Updates app icon badge


╔═══════════════════════════════════════════════════════════════╗
║  6. CLEANUP (Logout/Unmount)                                   ║
╚═══════════════════════════════════════════════════════════════╝

    User Logs Out / App Unmounts
      │
      ▼
    NotificationService.cleanup()
      │
      ├─► receivedListener.remove()
      ├─► responseListener.remove()
      ├─► Clear in-memory queue
      └─► Reset isInitialized flag

    clearAllNotifications()
      │
      ├─► dismissAllNotificationsAsync()
      ├─► setBadgeCountAsync(0)
      ├─► Clear queue array
      └─► Remove AsyncStorage keys
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA FLOW DIAGRAM                           │
└─────────────────────────────────────────────────────────────────┘

Backend/API
    │
    │ HTTP POST to Expo Push Service
    │ {
    │   to: "ExponentPushToken[xxx]",
    │   title: "New Bid",
    │   body: "John bid £500",
    │   data: {
    │     type: "bid_received",
    │     jobId: "uuid",
    │     contractorId: "uuid",
    │     bidAmount: 500
    │   }
    │ }
    │
    ▼
Expo Push Notification Service
    │
    ├──────────► Firebase Cloud Messaging (Android)
    │               │
    │               └─► Android Device
    │
    └──────────► Apple Push Notification Service (iOS)
                    │
                    └─► iOS Device

Device Receives Notification
    │
    ├─► [Foreground]
    │     │
    │     ├─► Notification banner shows
    │     ├─► Store in queue
    │     └─► Update badge
    │
    ├─► [Background]
    │     │
    │     ├─► System tray notification
    │     ├─► Sound/vibration
    │     └─► Badge updates
    │
    └─► [Killed]
          │
          ├─► System tray notification
          ├─► Stored by OS
          └─► Retrieved on app launch

User Interaction
    │
    ▼
Tap Notification
    │
    ├─► Extract data.type
    ├─► Extract data.jobId (or other IDs)
    └─► Navigate to screen
          │
          ├─► Main > JobsTab > JobDetails {jobId}
          ├─► Main > MessagingTab > Messaging {conversationId}
          ├─► Modal > MeetingDetails {meetingId}
          └─► etc.
```

## State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                              │
└─────────────────────────────────────────────────────────────────┘

NotificationService (Static Class)
│
├─► expoPushToken: string | null
│     └─► Stored in memory and database
│
├─► navigationRef: NavigationRef | null
│     └─► Set by RootNavigator
│
├─► notificationQueue: QueuedNotification[]
│     ├─► In-memory array
│     └─► Persisted to AsyncStorage
│
├─► receivedListener: Subscription | null
│     └─► Foreground notification handler
│
├─► responseListener: Subscription | null
│     └─► Notification tap handler
│
└─► isInitialized: boolean
      └─► Prevents duplicate listener setup


AsyncStorage Keys
│
├─► @mintenance/notification_queue
│     └─► Array of QueuedNotification objects
│
└─► @mintenance/last_notification_id
      └─► Last received notification identifier


Supabase Tables
│
├─► user_push_tokens
│     ├─► user_id
│     ├─► push_token (ExponentPushToken)
│     ├─► platform (ios/android)
│     └─► updated_at
│
├─► notifications
│     ├─► id
│     ├─► user_id
│     ├─► title
│     ├─► body
│     ├─► data (JSONB)
│     ├─► type
│     ├─► priority
│     ├─► read (boolean)
│     └─► created_at
│
└─► user_notification_preferences
      ├─► user_id
      ├─► preferences (JSONB)
      └─► updated_at
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING                                │
└─────────────────────────────────────────────────────────────────┘

Error Scenarios
│
├─► Permissions Denied
│     ├─► Log warning
│     ├─► Return null token
│     └─► Continue without notifications
│
├─► Network Error (Token Save)
│     ├─► Log error
│     ├─► Throw exception
│     └─► Retry on next app launch
│
├─► Navigation Not Ready
│     ├─► Queue notification
│     ├─► Wait for navigation (3s timeout)
│     └─► Process when ready or on next launch
│
├─► Deep Link Fails
│     ├─► Log error
│     ├─► Fallback to HomeTab
│     └─► Mark as processed
│
├─► Badge Update Fails
│     ├─► Log error
│     ├─► Don't throw (non-critical)
│     └─► Retry on next update
│
└─► Queue Processing Error
      ├─► Log error
      ├─► Skip failed item
      └─► Continue with next item
```

## Platform Differences

```
┌─────────────────────────────────────────────────────────────────┐
│                  iOS vs ANDROID HANDLING                         │
└─────────────────────────────────────────────────────────────────┘

iOS
├─► Notification Channels: Not used (system handles)
├─► Permission Request: Shows system dialog
├─► Badge Count: Managed by app
├─► Sound: System sounds + custom
├─► Background: Limited processing
└─► Actions: Can add button actions

Android
├─► Notification Channels: Multiple channels configured
│     ├─► default (MAX importance)
│     ├─► job-updates (HIGH importance)
│     ├─► bid-notifications (HIGH importance)
│     └─► meeting-reminders (DEFAULT importance)
├─► Permission Request: Shows system dialog (Android 13+)
├─► Badge Count: Requires launcher support
├─► Sound: Per-channel configuration
├─► Vibration: Custom patterns per channel
├─► LED Color: Per-channel configuration
└─► Background: Full processing capability
```

---

**Legend:**
- `│` Vertical flow
- `├─►` Branch/Option
- `└─►` Last branch
- `▼` Flow direction
- `[State]` App state
- `{param}` Parameter/Data

