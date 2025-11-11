# Payment Setup Reminders - Cron Job Configuration

## Overview

This cron job sends daily reminders to contractors who have pending escrow payments but haven't completed payment account setup.

## Endpoint

`GET /api/cron/payment-setup-reminders`

## Schedule

**Recommended:** Daily at 11:00 AM UTC (`0 11 * * *`)

This runs after the homeowner approval reminders (10 AM) to ensure contractors are notified after homeowners have had a chance to approve.

## Authentication

The endpoint requires a `CRON_SECRET` environment variable:

```bash
Authorization: Bearer ${CRON_SECRET}
```

## Setup Instructions

### Vercel Cron (Recommended)

If using Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/payment-setup-reminders",
      "schedule": "0 11 * * *"
    }
  ]
}
```

### Supabase Cron

Alternatively, use Supabase pg_cron:

```sql
SELECT cron.schedule(
  'payment-setup-reminders',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-app.vercel.app/api/cron/payment-setup-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    )
  );
  $$
);
```

### Manual Testing

Test the endpoint manually:

```bash
curl -X GET https://your-app.vercel.app/api/cron/payment-setup-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## What It Does

1. Finds all contractors with pending escrow payments
2. Checks if they have completed payment setup (`stripe_connect_account_id`)
3. Sends notification to each contractor needing setup
4. Returns summary of notifications sent

## Response Format

```json
{
  "success": true,
  "results": {
    "sent": 5,
    "failed": 0
  }
}
```

## Monitoring

Check logs for:
- Number of contractors needing setup
- Notification delivery success/failure
- Any errors during processing

## Related Endpoints

- `/api/admin/contractors/send-payment-setup-reminder` - Manual reminder for specific contractor
- `/admin/contractors/payment-setup` - Admin dashboard to view contractors needing setup

