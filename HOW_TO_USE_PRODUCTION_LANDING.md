# How to Use the Production Landing Page

## Quick Start

### 1. Import the Component

Replace your existing landing page with the production version:

```tsx
// apps/web/app/page.tsx
import { ProductionLandingPage } from './components/landing/ProductionLandingPage';
import { SkipLink } from './components/ui/SkipLink';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Accessibility Skip Links */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>

      {/* Production Landing Page */}
      <ProductionLandingPage />
    </div>
  );
}
```

### 2. Verify Design System CSS is Loaded

Ensure the Airbnb design system CSS is imported in your app:

```tsx
// apps/web/app/layout.tsx or app/globals.css
import '@/styles/airbnb-system.css';
```

Or add to your `globals.css`:
```css
@import '../styles/airbnb-system.css';
```

### 3. Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Features Included

### ✅ Full Viewport Hero
- 100vh height with min/max constraints
- Full-screen background image
- Gradient overlay for text readability
- Responsive scaling

### ✅ Working Search Bar
- Service dropdown with real options
- Location input with autocomplete-ready structure
- Date picker (text -> date type on focus)
- Navigation with query parameters
- Mobile-responsive layout

### ✅ Real Data Integration
- Fetches contractor count from Supabase
- Calculates job statistics
- Gets average ratings
- Loads featured contractors
- Error handling with fallbacks

### ✅ Performance Optimizations
- Next.js Image component throughout
- Lazy loading for below-fold images
- Intersection Observer for animations
- Proper image sizing attributes
- Priority loading for hero image

### ✅ Micro-Interactions
- Image zoom on hover (1.04 scale)
- Button lift effects
- Smooth transitions (cubic-bezier)
- Scroll-triggered animations
- Staggered card animations

### ✅ Mobile-First Design
- Responsive breakpoints (744px, 1128px)
- Touch-friendly tap targets (44px min)
- Collapsible search on mobile
- Horizontal scroll for categories
- Mobile typography scaling

---

## Customization

### Change Hero Image

```tsx
<Image
  src="https://your-custom-image-url.jpg"
  alt="Your custom alt text"
  fill
  priority
  quality={90}
/>
```

### Modify Services

```tsx
const SERVICES = [
  'Your Service 1',
  'Your Service 2',
  'Your Service 3',
  // Add more...
];
```

### Update Categories

```tsx
const CATEGORIES: Category[] = [
  {
    id: 'your-category',
    name: 'Your Category',
    icon: <YourIcon className="w-6 h-6" />,
    count: 123,
    image: 'https://your-category-image.jpg',
  },
  // Add more...
];
```

### Change Colors

Update the design system CSS:

```css
/* apps/web/styles/airbnb-system.css */
:root {
  --color-primary: 14 184 166; /* Your primary color */
  --color-primary-hover: 13 148 136; /* Your hover color */
}
```

---

## Database Requirements

### Expected Tables

**users table:**
```sql
- id (uuid)
- full_name (text)
- avatar_url (text)
- rating (numeric)
- jobs_completed (integer)
- location (text)
- role (text) -- 'contractor' or 'homeowner'
- is_verified (boolean)
```

**jobs table:**
```sql
- id (uuid)
- (other fields as per your schema)
```

**reviews table:**
```sql
- id (uuid)
- rating (numeric)
- (other fields as per your schema)
```

---

## Performance Tips

### 1. Image Optimization

Use high-quality images but properly sized:
- Hero: 1920x1080px (Full HD)
- Listing cards: 800x533px (3:2 ratio)
- Category images: 400x300px

### 2. Lazy Loading

The component already implements lazy loading for below-the-fold images. Ensure your Next.js config has:

```js
// next.config.js
module.exports = {
  images: {
    domains: ['images.unsplash.com', 'your-cdn-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
};
```

### 3. Caching

Consider implementing React Query for data caching:

```tsx
import { useQuery } from '@tanstack/react-query';

const { data: stats, isLoading } = useQuery({
  queryKey: ['landing-stats'],
  queryFn: fetchStats,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Accessibility Checklist

- [x] Semantic HTML (section, nav, header, footer)
- [x] Proper heading hierarchy (h1 -> h2 -> h3)
- [x] Alt text for all images
- [x] ARIA labels for icon-only buttons
- [x] Form labels properly associated
- [x] Keyboard navigation support
- [x] Focus visible states
- [x] Color contrast WCAG AA compliant

---

## SEO Optimization

Add to your page component:

```tsx
export const metadata = {
  title: 'Mintenance - Find Trusted Contractors Near You',
  description: 'Connect with verified professionals for your home improvement projects. Get competitive quotes and hire with confidence.',
  openGraph: {
    title: 'Mintenance - Find Trusted Contractors',
    description: 'Your trusted platform for home improvement',
    images: ['https://your-og-image.jpg'],
  },
};
```

---

## Testing

### Visual Testing
1. Test on Chrome, Firefox, Safari, Edge
2. Test on iPhone, Android
3. Test on different screen sizes (mobile, tablet, desktop)
4. Test with slow 3G network throttling

### Functionality Testing
1. Search with different services
2. Search with location
3. Click all CTAs
4. Test keyboard navigation
5. Test with screen reader

### Performance Testing
```bash
# Run Lighthouse audit
npm run build
npm run start
# Open Chrome DevTools > Lighthouse > Run audit
```

Target scores:
- Performance: > 90
- Accessibility: 100
- Best Practices: 100
- SEO: 100

---

## Troubleshooting

### Images Not Loading
```tsx
// Check Next.js config allows your image domains
// next.config.js
images: {
  domains: ['images.unsplash.com'],
}
```

### Search Not Working
```tsx
// Verify router is from next/navigation, not next/router
import { useRouter } from 'next/navigation';
```

### Styles Not Applied
```tsx
// Ensure design system CSS is imported
import '@/styles/airbnb-system.css';
```

### Data Not Fetching
```tsx
// Check Supabase connection
// Verify environment variables
// Check browser console for errors
```

---

## Deployment

### Before Deploying

1. **Build locally first:**
   ```bash
   npm run build
   ```

2. **Check for errors:**
   ```bash
   npm run type-check
   npm run lint
   ```

3. **Test production build:**
   ```bash
   npm run start
   ```

### Vercel Deployment

The component is optimized for Vercel deployment:
- Next.js Image optimization automatic
- Edge runtime compatible
- Environment variables handled

---

## Monitoring

### Add Analytics

```tsx
// Add to component
useEffect(() => {
  // Track page view
  analytics.track('Landing Page Viewed');

  // Track search
  const handleSearch = () => {
    analytics.track('Search Performed', {
      service: searchState.service,
      location: searchState.location,
    });
    // ...
  };
}, []);
```

### Add Error Tracking

```tsx
import * as Sentry from '@sentry/nextjs';

// In catch block
catch (err) {
  Sentry.captureException(err);
  setError('Failed to load data');
}
```

---

## What's Next?

1. **A/B Test Hero Copy** - Try different headlines
2. **Add Video** - Consider hero video instead of static image
3. **Personalization** - Show categories based on user location
4. **Testimonials** - Add social proof section
5. **Live Chat** - Add support widget
6. **Newsletter** - Capture emails before they leave

---

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase connection
3. Ensure all dependencies are installed
4. Check Next.js version compatibility (14+)

---

## Files Created

```
✅ apps/web/app/components/landing/ProductionLandingPage.tsx
✅ apps/web/styles/airbnb-system.css (updated)
✅ PRODUCTION_LANDING_ANALYSIS.md
✅ HOW_TO_USE_PRODUCTION_LANDING.md (this file)
```

---

**Status:** Ready for production use

**Last Updated:** 2025-12-02

**Version:** 1.0.0
