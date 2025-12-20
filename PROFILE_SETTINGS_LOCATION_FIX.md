# Profile Settings - Location Fields Fix

## Issue Summary
Both homeowner and contractor profile settings pages are missing location/address fields in the UI, even though:
- Database has the fields (latitude, longitude, address, city, postcode)
- Contractor settings has these fields in state but not rendered
- Homeowner settings completely missing these fields
- This is causing the discover jobs map to not work properly

## Root Cause
Location fields exist in database and state but are NOT rendered in the UI forms.

## Changes Required

### 1. Contractor Settings (`apps/web/app/contractor/settings/page.tsx`)

**Current State:**
- Lines 46-48: Fields exist in state (`address`, `city`, `postcode`)
- Lines 98-100: Fields NOT loaded from user data (hard-coded empty strings)
- **NO UI INPUTS** for these fields

**Fix Required:**

#### A) Load location data from user (lines 86-103):
```typescript
useEffect(() => {
  if (user) {
    setProfileData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
      profile_image_url: user.profile_image_url || '',
      company_name: user.company_name || '',
      trade: '',
      skills: '',
      address: user.address || '',      // FIX: Load from user
      city: user.city || '',            // FIX: Load from user
      postcode: user.postcode || '',    // FIX: Load from user
    });
  }
}, [user]);
```

#### B) Add location fields UI (after line 429, after Bio field):
```tsx
{/* Location Section */}
<div className="border-t border-gray-200 pt-6 mt-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Service Area</h3>
  <p className="text-sm text-gray-600 mb-6">
    Your location helps match you with nearby jobs and appears on the contractor map.
  </p>

  <div className="space-y-4">
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        Address
      </label>
      <input
        type="text"
        value={profileData.address}
        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
        placeholder="123 Main Street"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          City
        </label>
        <input
          type="text"
          value={profileData.city}
          onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          placeholder="London"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Postcode
        </label>
        <input
          type="text"
          value={profileData.postcode}
          onChange={(e) => setProfileData({ ...profileData, postcode: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          placeholder="SW1A 1AA"
        />
      </div>
    </div>

    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center mt-0.5">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-teal-900">Location will be geocoded automatically</p>
          <p className="text-xs text-teal-700 mt-1">
            When you save, we'll automatically determine your precise coordinates for job matching
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### C) Update save handler to use contractor API (line 126-145):
Change from `/api/user/update-profile` to `/api/contractor/update-profile` which already supports geocoding:

```typescript
const handleSaveProfile = async () => {
  setIsSaving(true);
  try {
    const formData = new FormData();

    Object.entries(profileData).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const response = await fetch('/api/contractor/update-profile', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      toast.success('Profile updated successfully. Location geocoded.');
      // Refresh page to reload geocoded coordinates
      window.location.reload();
    } else {
      const error = await response.json();
      toast.error(error.message || 'Failed to update profile');
    }
  } catch (error) {
    toast.error('Error updating profile');
  } finally {
    setIsSaving(false);
  }
};
```

### 2. Homeowner Settings (`apps/web/app/settings/page.tsx`)

**Current State:**
- NO location fields in state
- NO location fields in UI
- Uses `/api/user/update-profile` which doesn't handle geocoding

**Fix Required:**

#### A) Add location fields to state (around line 35-42):
```typescript
const [profileData, setProfileData] = useState({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  bio: '',
  profile_image_url: '',
  address: '',      // ADD
  city: '',         // ADD
  postcode: '',     // ADD
});
```

#### B) Load location data from user:
```typescript
useEffect(() => {
  if (user) {
    setProfileData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
      profile_image_url: user.profile_image_url || '',
      address: user.address || '',      // ADD
      city: user.city || '',            // ADD
      postcode: user.postcode || '',    // ADD
    });
  }
}, [user]);
```

#### C) Add same location UI fields as contractor (after phone field)

#### D) Update API endpoint to handle geocoding:
**File**: `apps/web/app/api/user/update-profile/route.ts`

Copy geocoding logic from `apps/web/app/api/contractor/update-profile/route.ts` (lines 293-354)

### 3. Update User Type Definition

**File**: `packages/types/src/index.ts`

**Current** (lines 4-29):
```typescript
export interface User {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  phone?: string;
  phone_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

**Add location fields**:
```typescript
export interface User {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  phone?: string;
  phone_verified?: boolean;
  // Location fields
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}
```

## Testing Steps

### For Contractors:
1. Log in as contractor
2. Go to `/contractor/settings`
3. Fill in Address, City, Postcode
4. Click "Save changes"
5. **Expected**: Toast shows "Profile updated successfully. Location geocoded."
6. **Verify**: Check database `users` table for latitude/longitude
7. Go to `/contractor/discover`
8. **Expected**: Map shows contractor location marker
9. Create a job as homeowner near this location
10. **Expected**: Job appears on contractor's discover map

### For Homeowners:
1. Log in as homeowner
2. Go to `/settings`
3. Fill in Address, City, Postcode
4. Click "Save changes"
5. **Expected**: Location saved with coordinates
6. **Verify**: Check database `users` table for latitude/longitude

## API Changes Summary

### Contractor API (Already Works)
- **Endpoint**: `POST /api/contractor/update-profile`
- **Geocoding**: ✅ Already implemented (lines 293-354)
- **Supports**: Both direct coordinates from Places Autocomplete AND fallback geocoding

### Homeowner API (Needs Fix)
- **Endpoint**: `POST /api/user/update-profile`
- **Geocoding**: ❌ NOT implemented
- **Action Required**: Copy geocoding logic from contractor API

## Database Verification Queries

```sql
-- Check contractor location
SELECT id, email, first_name, last_name, latitude, longitude, address, city, postcode
FROM users
WHERE role = 'contractor'
  AND email = 'contractor@example.com';

-- Check homeowner location
SELECT id, email, first_name, last_name, latitude, longitude, address, city, postcode
FROM users
WHERE role = 'homeowner'
  AND email = 'homeowner@example.com';

-- Find users WITHOUT location
SELECT id, email, role, city, postcode, latitude, longitude
FROM users
WHERE latitude IS NULL OR longitude IS NULL;
```

## Impact on Discover Jobs Map

### Current Issue:
1. Contractor has NO location set (latitude/longitude is NULL)
2. Discover map filtering logic requires contractor location for radius calculations
3. Even if jobs have coordinates, they don't show if contractor has no location

### After Fix:
1. Contractor sets location via settings page
2. Location is auto-geocoded to lat/lng
3. Discover map shows:
   - Contractor's location marker (arrow icon)
   - All jobs within selected radius (default 10km)
   - Distance calculations work properly

## Priority

**CRITICAL** - This is the root cause of the "No Jobs in This Area" issue reported by the user.

The logging we added will confirm this:
- Server logs will show `contractorLocation: { latitude: null, longitude: null, ... }`
- Client logs will show contractor has no location for filtering

## Next Steps

1. ✅ Read this document
2. Apply fixes to contractor settings page (easiest, already has API support)
3. Test contractor can set location
4. Apply fixes to homeowner settings page
5. Update homeowner API to support geocoding
6. Test end-to-end flow
7. Remove debug logging once confirmed working
