# Google Maps API Setup Guide

**Date**: October 31, 2025  
**Purpose**: Instructions for configuring Google Maps API for Mintenance platform

---

## Required Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
# Google Maps API Key (for client-side map rendering)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Google Maps API Key (for server-side geocoding - already configured)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## Obtaining an API Key

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Name it: "Mintenance Maps"

### 2. Enable Required APIs

Navigate to "APIs & Services" > "Library" and enable:

- ✅ **Maps JavaScript API** (for client-side maps)
- ✅ **Geocoding API** (already enabled for server-side)
- ✅ **Places API** (for autocomplete)
- ✅ **Geolocation API** (optional, for better location detection)

### 3. Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated key
4. Click "Restrict Key" (recommended)

### 4. Restrict API Key (Security)

**Application Restrictions**:
- For production: HTTP referrers
  - Add: `https://yourdomain.com/*`
  - Add: `https://www.yourdomain.com/*`
- For development: None (or add `http://localhost:3000/*`)

**API Restrictions**:
- Restrict key to only:
  - Maps JavaScript API
  - Geocoding API
  - Places API

### 5. Add to Environment

**Local Development** (`.env.local`):
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here
```

**Production** (Vercel/Deployment):
1. Go to project settings
2. Add environment variable: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. Set value to your restricted production key

---

## Pricing & Quotas

### Free Tier (Monthly)

- **Maps JavaScript API**: 28,500 map loads FREE
- **Geocoding API**: 40,000 requests FREE (already using)
- **Places API**: 200,000 requests FREE

### Costs After Free Tier

- **Maps JavaScript API**: $7.00 per 1,000 map loads
- **Geocoding API**: $5.00 per 1,000 requests
- **Places API**: $17.00 per 1,000 requests (autocomplete)

### Expected Usage (1,000 users)

**Monthly Estimate**:
- Map loads: 1,000 users × 2 views = 2,000 loads → **FREE** ✅
- Geocoding: 50 new areas/month → **FREE** ✅
- **Total**: $0/month

**At Scale (20,000 users)**:
- Map loads: 20,000 × 2 = 40,000 loads
- Billable: 40,000 - 28,500 = 11,500 loads
- Cost: 11,500 × $0.007 = **$80.50/month**

### Setting Budget Alerts

1. Go to "Billing" > "Budgets & alerts"
2. Create budget: $100/month
3. Set alert at 50%, 90%, 100%
4. Add email notification

---

## Testing the Setup

### 1. Verify API Key Works

Run this in browser console on your site:
```javascript
fetch(`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`)
  .then(() => console.log('✅ API Key is valid'))
  .catch(() => console.error('❌ API Key is invalid'));
```

### 2. Check Environment Variable

```bash
# In apps/web directory
npm run dev

# Check console for:
# "✅ Map loaded in XXXms" - means it's working
# "❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured" - means it's missing
```

### 3. Test Map Loading

1. Navigate to `/contractors` (browse map)
2. Click "Map View" toggle
3. Map should load with contractors visible
4. Check browser console for any errors

---

## Troubleshooting

### Error: "Google Maps JavaScript API has not been authorized"

**Solution**: Add your domain to API key restrictions
- Go to Google Cloud Console > Credentials
- Edit API key
- Add your domain to HTTP referrers

### Error: "This API project is not authorized to use this API"

**Solution**: Enable the Maps JavaScript API
- Go to Google Cloud Console > Library
- Search for "Maps JavaScript API"
- Click "Enable"

### Error: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured"

**Solution**: Add environment variable
- Create/edit `.env.local` in `apps/web/`
- Add: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`
- Restart dev server: `npm run dev`

### Map Loads But Shows Gray Boxes

**Solution**: Check billing account
- Maps API requires billing account (even for free tier)
- Go to Billing > Link a billing account
- Note: You won't be charged within free tier limits

### Map Loads Slowly

**Possible Causes**:
1. Network latency - normal on first load
2. Too many markers - implement clustering
3. API quotas reached - check usage dashboard

**Solutions**:
- Implement marker clustering (>20 contractors)
- Lazy load map library
- Cache map tiles

---

## Security Best Practices

### 1. Never Expose Unrestricted Keys

❌ **DON'T**: Use same key for server and client
❌ **DON'T**: Commit keys to version control
❌ **DON'T**: Use unrestricted keys in production

✅ **DO**: Use separate keys for dev and production
✅ **DO**: Restrict by HTTP referrer (client) or IP (server)
✅ **DO**: Store in environment variables

### 2. Monitor Usage

- Set up budget alerts
- Review usage weekly
- Check for suspicious activity
- Rotate keys if compromised

### 3. Rate Limiting

Implement rate limiting to prevent abuse:
```typescript
// In API routes
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
```

---

## Monitoring & Analytics

### 1. Usage Dashboard

Monitor in Google Cloud Console:
- "APIs & Services" > "Dashboard"
- View metrics for each API
- Track requests, errors, latency

### 2. Performance Tracking

Already implemented in `GoogleMapContainer.tsx`:
```typescript
const loadTime = performance.now() - loadStartTime;
console.log(`✅ Map loaded in ${loadTime.toFixed(0)}ms`);
```

### 3. Error Tracking

Errors are logged to console and can be sent to your error tracking service (e.g., Sentry):
```typescript
.catch((err) => {
  console.error('❌ Error loading Google Maps:', err);
  // Send to Sentry, LogRocket, etc.
});
```

---

## Alternative: Mapbox

If Google Maps costs become prohibitive, consider Mapbox:

**Pros**:
- More generous free tier (50,000 loads/month)
- Better pricing at scale
- Modern styling options

**Cons**:
- Different API (requires migration)
- Less familiar to users
- Fewer features (e.g., Street View)

**Migration Path**: See `MAP_SYSTEMS_IMPLEMENTATION_PLAN.md` for details

---

## Next Steps

1. ✅ Install dependencies (completed)
2. ✅ Create map components (completed)
3. ✅ Create map utilities (completed)
4. ⏳ Add API key to environment
5. ⏳ Test map loading
6. ⏳ Begin Phase 2 (Browse Map implementation)

---

## Support & Resources

**Documentation**:
- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)
- [API Key Best Practices](https://developers.google.com/maps/api-key-best-practices)

**Community**:
- [Stack Overflow - google-maps](https://stackoverflow.com/questions/tagged/google-maps)
- [Google Maps Platform GitHub](https://github.com/googlemaps)

---

**Last Updated**: October 31, 2025  
**Status**: Infrastructure Ready - Awaiting API Key Configuration  
**Next**: Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local`

