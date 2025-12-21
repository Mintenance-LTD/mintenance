# Quick Start Guide - Real Data Integration

## TL;DR
Calendar and Quotes pages now use **REAL data from Supabase** instead of mock data.

---

## Apply Changes (Required)

### Step 1: Run Database Migration
```bash
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Apply the migration
npx supabase db push
```

This creates 3 new tables:
- `appointments` - Scheduled meetings/consultations
- `contractor_availability` - Weekly working hours
- `appointment_slots` - Available booking slots

### Step 2: Restart Development Server
```bash
# Kill existing server (Ctrl+C)

# Restart
npm run dev
```

### Step 3: Test Calendar Page
```bash
# Navigate to:
http://localhost:3000/contractor/scheduling
```

**What to expect**:
- ✅ Stats show 0 (no data yet)
- ✅ Calendar displays correctly
- ✅ Can create new appointment
- ✅ Appointment saves to database
- ✅ Stats update automatically
- ✅ Can set availability hours

### Step 4: Test Quotes Page
```bash
# Navigate to:
http://localhost:3000/contractor/quotes
```

**What to expect**:
- ✅ Shows quotes from database
- ✅ If empty, shows "No quotes" message
- ✅ Can filter by status
- ✅ Can search quotes

---

## What Changed

### Calendar Page
**BEFORE**:
```typescript
const appointments = [
  { id: '1', title: 'Fake Meeting', ...mockData }
];
```

**AFTER**:
```typescript
const loadAppointments = async () => {
  const response = await fetch('/api/contractor/appointments');
  const data = await response.json();
  setAppointments(data.appointments); // Real data from database
};
```

### Quotes Page
**BEFORE**:
```typescript
const quotes = [
  { id: 'q1', jobTitle: 'Fake Quote', ...mockData }
];
```

**AFTER**:
```typescript
const loadQuotes = async () => {
  const response = await fetch('/api/contractor/quotes');
  const data = await response.json();
  setQuotes(data.quotes); // Real data from database
};
```

---

## New API Endpoints

### 1. Appointments
```bash
# Get appointments
GET /api/contractor/appointments?daysAhead=30

# Create appointment
POST /api/contractor/appointments
Body: {
  title: "Site Visit",
  clientName: "John Doe",
  appointmentDate: "2025-12-05",
  startTime: "09:00",
  endTime: "10:00",
  locationType: "onsite"
}

# Get statistics
GET /api/contractor/appointments/stats
```

### 2. Availability
```bash
# Get availability
GET /api/contractor/availability

# Update availability
PUT /api/contractor/availability
Body: {
  availability: [
    { day: "Monday", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },
    ...
  ]
}
```

### 3. Quotes
```bash
# Get quotes
GET /api/contractor/quotes?status=all

# Create quote
POST /api/contractor/quotes
Body: {
  title: "Kitchen Renovation Quote",
  clientName: "Jane Smith",
  totalAmount: 15000,
  ...
}
```

---

## Troubleshooting

### Issue: "Failed to fetch appointments"
**Solution**:
1. Check Supabase is running: `npx supabase status`
2. Verify migration applied: `npx supabase db diff`
3. Check user is logged in as contractor

### Issue: "Unauthorized" error
**Solution**:
1. Ensure you're logged in
2. Verify user role is 'contractor'
3. Check RLS policies in Supabase dashboard

### Issue: Empty data / No stats
**Solution**:
- This is normal if no data exists yet
- Create a test appointment to verify it works
- Stats will update automatically

---

## Files Modified/Created

### Migrations:
- ✅ `supabase/migrations/20251203000003_add_appointments_and_availability.sql`

### API Routes:
- ✅ `apps/web/app/api/contractor/appointments/route.ts`
- ✅ `apps/web/app/api/contractor/appointments/stats/route.ts`
- ✅ `apps/web/app/api/contractor/availability/route.ts`
- ✅ `apps/web/app/api/contractor/quotes/route.ts`

### Pages:
- ✅ `apps/web/app/contractor/scheduling/components/SchedulingClient.tsx`
- ✅ `apps/web/app/contractor/quotes/page.tsx`

### Documentation:
- ✅ `MOCK_DATA_REPLACEMENT_SUMMARY.md` - Full details
- ✅ `REAL_DATA_INTEGRATION_COMPLETE.md` - Technical specs
- ✅ `QUICK_START_REAL_DATA.md` - This file
