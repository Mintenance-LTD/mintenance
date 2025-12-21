# Debug Instructions for Bid Submission Issue

## Current Status
- Frontend form collects `estimatedDuration` (number) and `proposedStartDate` (date string)
- Validation schema accepts both fields (with preprocessing for type conversion)
- Backend includes fields in bid payload
- Database schema supports both fields

## What to Check

### 1. Browser Console (F12 → Console)
Look for these logs when submitting a bid:
- `[BID_SUBMIT_CLIENT] Request payload:` - Shows what's being sent to API
- `[BID_SUBMIT_CLIENT] Response status:` - Shows if request succeeded (ok: true/false)

**What to report:**
- What values are shown for `estimatedDuration` and `proposedStartDate`?
- What is the response status (ok: true/false, status code)?
- Any JavaScript errors?

### 2. Server Console (where `npm run dev` is running)
Look for these logs:
- `[BID_SUBMIT] Raw request body` - Shows what API received
- `[BID_SUBMIT] Validation passed` or `[BID_SUBMIT] Validation failed`
- `[BID_SUBMIT] Bid payload created` - Shows what will be saved
- `[BID_CREATE] Inserting bid with payload` - Shows database insert
- `[BID_CREATE] Bid created successfully` - Shows saved values

**What to report:**
- Do you see validation passed or failed?
- What values are shown for estimatedDuration/proposedStartDate at each step?
- Any database errors?

### 3. UI Behavior
- Does the form submit successfully (shows success message)?
- Does it show an error message? What does it say?
- After submission, if you view the bid, do you see duration/start date?

### 4. Database Check (Optional)
If you have database access, check:
```sql
SELECT id, estimated_duration, proposed_start_date, created_at 
FROM bids 
ORDER BY created_at DESC 
LIMIT 1;
```

## Common Issues to Check

1. **Validation Error**: Check if validation is rejecting the fields
2. **Type Mismatch**: estimatedDuration might be sent as string instead of number
3. **Date Format**: proposedStartDate might be in wrong format
4. **Database Constraint**: Database might be rejecting the values
5. **Silent Failure**: Fields might be optional and getting dropped

