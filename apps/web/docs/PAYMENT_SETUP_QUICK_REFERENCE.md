# Payment Setup System - Quick Reference

## For Contractors

### Setting Up Payments
1. Go to `/contractor/payouts`
2. Click "Set Up Payout Account"
3. Complete Stripe onboarding (bank account, identity verification)
4. Return to platform - account is now verified

### What Happens If You Don't Set Up?
- ❌ **Cannot accept bids/jobs** - System blocks acceptance
- 💰 **Funds held in escrow** - Cannot receive payments
- 📧 **Daily reminders** - Get notified about pending payments
- 📊 **Dashboard banner** - See pending amounts on dashboard

### When You'll Get Notifications
- When escrow is ready to release but you haven't set up payments
- Daily reminders if you have pending payments
- When admin sends manual reminder

## For Admins

### Viewing Contractors Needing Setup
1. Navigate to **Admin → Payment Setup** (sidebar)
2. View list of contractors with pending payments
3. See:
   - Contractor name and email
   - Number of pending escrows
   - Total pending amount
   - Oldest escrow date

### Sending Reminders
- **Automatic**: Daily at 11 AM UTC via cron job
- **Manual**: Click "Send Reminder" button for specific contractor

### Monitoring
- Check dashboard regularly for contractors needing setup
- Monitor notification delivery in logs
- Track setup completion rates

## For Developers

### Key Files
- `apps/web/lib/services/contractor/PaymentSetupNotificationService.ts` - Core service
- `apps/web/app/api/cron/payment-setup-reminders/route.ts` - Cron endpoint
- `apps/web/app/admin/contractors/payment-setup/` - Admin dashboard
- `apps/web/app/contractor/dashboard-enhanced/components/PaymentSetupBanner.tsx` - Banner component

### Testing
```bash
# Test cron endpoint manually
curl -X GET http://localhost:3000/api/cron/payment-setup-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test admin reminder
curl -X POST http://localhost:3000/api/admin/contractors/send-payment-setup-reminder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contractorId": "contractor-uuid"}'
```

### Environment Variables
```bash
CRON_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_...
```

## Troubleshooting

### Contractor Not Receiving Notifications
1. Check `users.stripe_connect_account_id` is NULL
2. Verify contractor has pending escrows
3. Check notification was created in `notifications` table
4. Verify cron job is running

### Bid Acceptance Still Works Without Setup
1. Verify payment check is in `/api/jobs/[id]/bids/[bidId]/accept/route.ts`
2. Check error response includes `requiresPaymentSetup: true`
3. Verify frontend handles the error correctly

### Cron Job Not Running
1. Check `vercel.json` has cron configuration
2. Verify `CRON_SECRET` environment variable is set
3. Check Vercel dashboard for cron job status
4. Review logs for authentication errors

