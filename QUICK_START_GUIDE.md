# Quick Start Guide - Dashboard Improvements

## 🚀 What's New?

### 1. **Permanent Sidebar** (All Pages)
- Terracotta/coral color scheme
- Visible on all dashboard pages
- Role-based navigation (homeowner vs contractor)
- "one home solution" branding

### 2. **Currency Support** (Pounds £)
- Default: British Pound (£)
- Support for USD ($) and EUR (€)
- User preference saved in localStorage
- Automatic locale formatting

### 3. **Real Data Display**
- No more $0.00 placeholders
- Real-time data from database
- Properties, subscriptions, payments all integrated
- Accurate KPI calculations

---

## 📂 New Files Created

```
apps/web/
├── components/
│   └── layouts/
│       └── UnifiedSidebar.tsx          ← New persistent sidebar
└── lib/
    └── utils/
        └── currency.ts                  ← Currency utility
```

---

## 🔧 Modified Files

```
apps/web/app/
├── dashboard/
│   ├── page.tsx                         ← Updated data fetching
│   └── components/
│       └── KpiCards.tsx                 ← Enhanced styling + currency
└── contractor/
    └── dashboard-enhanced/
        └── page.tsx                     ← Updated layout + currency
```

---

## 💻 Usage

### Using the Unified Sidebar

```typescript
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';

// For Homeowner
<UnifiedSidebar 
  userRole="homeowner"
  userInfo={{
    name: "Jane Smith",
    email: "jane@example.com",
    avatar: "https://..."
  }}
  onLogout={() => window.location.href = '/api/auth/logout'}
/>

// For Contractor
<UnifiedSidebar 
  userRole="contractor"
  userInfo={{
    name: "John Builder",
    email: "john@contractor.com"
  }}
  onLogout={() => window.location.href = '/api/auth/logout'}
/>
```

### Using Currency Functions

```typescript
import { 
  formatMoney,
  setPreferredCurrency,
  getCurrencySymbol 
} from '@/lib/utils/currency';

// Format money (default GBP)
const display = formatMoney(1500); // "£1,500.00"

// Change currency preference
setPreferredCurrency('USD');
const displayUSD = formatMoney(1500); // "$1,500.00"

// Get symbol only
const symbol = getCurrencySymbol(); // "£"
```

---

## 🎨 Color Scheme

### Sidebar Colors
```css
Background: #C97C6C (Terracotta/Coral)
Hover: #B36B5C
Text: #FFFFFF (White)
Border: rgba(255, 255, 255, 0.15)
Active: rgba(255, 255, 255, 0.2)
```

### Active State
- White text
- Transparent white background
- 3px white left border

---

## 📊 Data Structure

### Dashboard Fetches
1. **Jobs** - All user's jobs
2. **Bids/Quotes** - Contractor quotes
3. **Properties** - User properties
4. **Subscriptions** - Active subscriptions
5. **Payments** - Payment/invoice data
6. **Messages** - Recent messages

### KPI Calculations
- Jobs: Average size, total revenue, completed, scheduled
- Bids: Active, pending review, accepted, average
- Properties: Active, pending
- Subscriptions: Active, overdue
- Invoices: Past due, due, unsent, open

---

## 🔍 Testing the Changes

### 1. Check Sidebar
```bash
# Navigate to dashboard
http://localhost:3000/dashboard

# Verify:
✓ Sidebar is visible
✓ Terracotta color
✓ Navigation works
✓ Logout works
```

### 2. Check Currency
```bash
# Open browser console
localStorage.setItem('preferredCurrency', 'USD')
# Refresh page
# Should see $ instead of £
```

### 3. Check Real Data
```bash
# Dashboard should show:
✓ Real job counts (not 0)
✓ Real revenue (not £0.00)
✓ Real property counts
✓ Real subscription counts
```

---

## 🐛 Troubleshooting

### Sidebar Not Showing
- Check import: `import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar'`
- Verify userRole is 'homeowner' or 'contractor'
- Check console for errors

### Currency Shows $0.00
- Verify database has data
- Check `budget` field exists on jobs
- Verify `total_amount` on quotes
- Check `amount` field on payments

### Properties/Subscriptions Show 0
- Ensure `properties` table exists
- Ensure `subscriptions` table exists
- Run migrations if needed
- Check `owner_id` and `user_id` foreign keys

### Linting Errors
```bash
# Run linter
npm run lint

# Should show: No linter errors found
```

---

## 📝 Database Requirements

Ensure these tables exist:

```sql
-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'active',
  amount NUMERIC,
  next_billing_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table (may already exist)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payer_id UUID REFERENCES users(id),
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Security Notes

- User authentication required for all dashboards
- Logout uses proper API route (`/api/auth/logout`)
- No sensitive data in localStorage (only currency preference)
- All queries filtered by user ID

---

## 🎯 Next Steps

1. **Test on different browsers**
2. **Test mobile responsiveness**
3. **Add real property data** to database
4. **Add real subscription data** to database
5. **Test with multiple users**
6. **Verify currency switching** works
7. **Check all sidebar links** navigate correctly

---

## 📞 Support

If you encounter issues:

1. Check `DASHBOARD_IMPROVEMENTS_SUMMARY.md` for detailed info
2. Verify database tables exist
3. Check browser console for errors
4. Ensure all dependencies are installed
5. Run `npm run lint` to check for errors

---

## ✅ Verification Checklist

- [ ] Sidebar shows on dashboard
- [ ] Sidebar shows terracotta color
- [ ] Navigation items work
- [ ] Currency shows £ by default
- [ ] Real data displays (not zeros)
- [ ] Properties count shows correctly
- [ ] Subscriptions count shows correctly
- [ ] Invoices count shows correctly
- [ ] Logout button works
- [ ] Contractor dashboard works
- [ ] Homeowner dashboard works
- [ ] No console errors
- [ ] No linting errors

---

**All systems ready to go! 🎉**

