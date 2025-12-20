# Smart Notification Agent - Implementation Summary

## ✅ Implementation Complete

The Smart Notification Agent has been successfully implemented with the following features:

### Core Features

1. **Adaptive Notification Preferences**
   - Learns from user engagement patterns (open rates, click rates)
   - Adjusts notification timing based on when users are most active
   - Tracks engagement statistics per user and notification type

2. **Priority Routing**
   - **Urgent**: Disputes, payment issues, security alerts (sent immediately)
   - **High**: Bid accepted, job assigned, payment released (sent immediately, even during quiet hours)
   - **Medium**: Bid received, messages, review requests (intelligent scheduling)
   - **Low**: Weekly summaries, marketing (batched and sent at optimal times)

3. **Quiet Hours**
   - Users can set quiet hours (start/end time)
   - Non-urgent notifications are delayed until after quiet hours
   - Urgent and high-priority notifications always send immediately

4. **Intelligent Scheduling**
   - Learns optimal send times for each notification type
   - Schedules notifications based on user engagement patterns
   - Batches low-priority notifications for daily digest

5. **Engagement Tracking**
   - Tracks when notifications are opened, clicked, or dismissed
   - Measures engagement delay (time from sent to opened)
   - Updates learning model based on engagement data

---

## Files Created/Modified

### New Files
1. **`supabase/migrations/20250201000001_add_notification_agent_tables.sql`**
   - Creates `notification_engagement` table
   - Creates `notification_preferences` table
   - Creates `notification_queue` table
   - Adds notification preferences to `automation_preferences` table

2. **`apps/web/lib/services/agents/NotificationAgent.ts`**
   - Core agent service with learning and scheduling logic
   - Priority routing logic
   - Quiet hours checking
   - Engagement tracking
   - Optimal timing calculation

3. **`apps/web/lib/services/notifications/NotificationService.ts`**
   - Wrapper service for creating notifications
   - Uses NotificationAgent for intelligent routing
   - Handles immediate sending vs queuing

4. **`apps/web/app/api/cron/notification-processor/route.ts`**
   - Cron endpoint for processing queued notifications
   - Batch learning from engagement data
   - Should be called every 15 minutes

### Modified Files
1. **`apps/web/lib/services/agents/AutomationPreferencesService.ts`**
   - Added `notificationLearningEnabled` preference
   - Added `quietHoursStart` and `quietHoursEnd` preferences

2. **`apps/web/app/api/notifications/route.ts`**
   - Added `PATCH` endpoint for tracking engagement
   - Integrated NotificationService

---

## Database Schema

### notification_engagement
Tracks user engagement with notifications for learning:
- `user_id`, `notification_id`, `notification_type`
- `opened`, `clicked`, `dismissed` (boolean flags)
- `opened_at`, `clicked_at`, `dismissed_at` (timestamps)
- `engagement_delay_seconds` (time from sent to engagement)

### notification_preferences
Stores learned preferences and engagement statistics:
- `preferred_notification_times` (JSONB: type -> optimal time)
- `engagement_rate_by_type` (JSONB: type -> engagement rate)
- `avg_open_rate`, `avg_click_rate` (aggregate statistics)
- `learning_confidence` (0-100, based on data points)

### notification_queue
Priority queue for scheduled notifications:
- `priority` (urgent, high, medium, low)
- `scheduled_for` (when to send)
- `status` (pending, sent, cancelled, failed)
- `batch_id` (for grouping low-priority notifications)

---

## Usage

### Creating Notifications

**Before (direct database insert):**
```typescript
await serverSupabase.from('notifications').insert({
  user_id: userId,
  type: 'bid_received',
  title: 'New Bid',
  message: 'You have a new bid',
  // ...
});
```

**After (using NotificationService):**
```typescript
import { NotificationService } from '@/lib/services/notifications/NotificationService';

await NotificationService.createNotification({
  userId: userId,
  type: 'bid_received',
  title: 'New Bid',
  message: 'You have a new bid',
  actionUrl: '/jobs/123',
});
```

The NotificationService will:
- Check if notification should be sent immediately or queued
- Respect quiet hours
- Use optimal timing if learning is enabled
- Queue low-priority notifications for batching

### Tracking Engagement

When a user opens/clicks a notification, track it:

```typescript
// PATCH /api/notifications
await fetch('/api/notifications', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notificationId: '...',
    userId: '...',
    action: 'opened' // or 'clicked' or 'dismissed'
  })
});
```

### Setting Quiet Hours

Users can set quiet hours in their automation preferences:

```typescript
await AutomationPreferencesService.updatePreferences(userId, {
  quietHoursStart: '22:00', // 10 PM
  quietHoursEnd: '08:00',   // 8 AM
});
```

---

## Cron Job Setup

The notification processor cron job should run every 15 minutes:

```bash
# Vercel Cron (vercel.json)
{
  "crons": [{
    "path": "/api/cron/notification-processor",
    "schedule": "*/15 * * * *"
  }]
}
```

Or use Supabase Cron:
```sql
SELECT cron.schedule(
  'process-notifications',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-app.vercel.app/api/cron/notification-processor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    )
  );
  $$
);
```

---

## Migration Required

Run the database migration:
```bash
supabase migration up
# or
psql -f supabase/migrations/20250201000001_add_notification_agent_tables.sql
```

---

## Next Steps

### Recommended Updates

1. **Update existing notification creation code**
   - Replace direct `notifications` table inserts with `NotificationService.createNotification()`
   - Key locations to update:
     - `apps/web/app/api/jobs/route.ts` (job creation notifications)
     - `apps/web/app/api/contractor/submit-bid/route.ts` (bid notifications)
     - `apps/web/lib/services/notifications/TrialNotifications.ts`
     - Any other places creating notifications directly

2. **Add engagement tracking to frontend**
   - Track when users open notifications
   - Track when users click notifications
   - Call `/api/notifications` PATCH endpoint

3. **Add UI for quiet hours**
   - Allow users to set quiet hours in settings
   - Show notification preferences in user profile

4. **Monitor and optimize**
   - Monitor engagement rates
   - Adjust priority classifications if needed
   - Fine-tune learning algorithm based on data

---

## Testing

### Manual Testing

1. **Test immediate sending:**
   ```typescript
   // Urgent notification should send immediately
   await NotificationService.createNotification({
     userId: '...',
     type: 'dispute',
     title: 'Dispute Alert',
     message: 'A dispute has been filed',
   });
   ```

2. **Test queuing:**
   ```typescript
   // Low-priority notification should be queued
   await NotificationService.createNotification({
     userId: '...',
     type: 'weekly_summary',
     title: 'Weekly Summary',
     message: 'Your weekly summary is ready',
   });
   // Check notification_queue table for queued item
   ```

3. **Test quiet hours:**
   ```typescript
   // Set quiet hours
   await AutomationPreferencesService.updatePreferences(userId, {
     quietHoursStart: '22:00',
     quietHoursEnd: '08:00',
   });
   
   // Non-urgent notification during quiet hours should be queued
   await NotificationService.createNotification({
     userId: '...',
     type: 'bid_received',
     title: 'New Bid',
     message: 'You have a new bid',
   });
   ```

4. **Test engagement tracking:**
   ```typescript
   // Create notification
   const notificationId = await NotificationService.createNotification({...});
   
   // Track engagement
   await NotificationService.trackEngagement(notificationId, userId, {
     opened: true,
     clicked: false,
   });
   ```

5. **Test learning:**
   ```typescript
   // After collecting engagement data, trigger learning
   await NotificationAgent.learnOptimalTiming(userId);
   
   // Check notification_preferences table for learned preferences
   ```

---

## Configuration

### Environment Variables

Ensure `CRON_SECRET` is set for the cron endpoint:
```env
CRON_SECRET=your-secret-key-here
```

### Default Behavior

- **Notification learning**: Enabled by default
- **Quiet hours**: Not set by default (all notifications send immediately)
- **Priority routing**: Automatic based on notification type

---

## Performance Considerations

- **Batch processing**: Queued notifications are processed in batches (50 at a time)
- **Learning**: Limited to 20 users per cron run to avoid overload
- **Engagement tracking**: Async, doesn't block notification creation
- **Database indexes**: Optimized for common queries

---

## Future Enhancements

1. **Mobile sleep pattern detection**: Detect user sleep patterns automatically
2. **Advanced batching**: Smart batching for low-priority notifications
3. **A/B testing**: Test different notification timings
4. **Personalization**: More sophisticated learning algorithms
5. **Notification channels**: Support for email, SMS, push notifications

---

## Notes

- The agent respects user preferences - if `notificationLearningEnabled` is false, notifications send immediately (default behavior)
- Urgent and high-priority notifications always send immediately, regardless of quiet hours or learning
- Learning improves over time as more engagement data is collected
- The system gracefully falls back to immediate sending if learning fails

