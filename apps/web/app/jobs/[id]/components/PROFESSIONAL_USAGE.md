# JobDetailsProfessional Component Usage Guide

## Overview
Professional job details page with Birch/Revealbot design system (Navy/Mint/Gold color scheme).

## Features
✅ Clean, minimal design with professional typography
✅ 2-column layout (8-4 grid) with sticky sidebar
✅ Photo gallery with lightbox
✅ Status badges and priority indicators
✅ Budget display card
✅ Property information
✅ Homeowner/Contractor cards with avatars
✅ Bids section (homeowner view)
✅ Timeline/Schedule information
✅ Action buttons (Edit, Submit Bid, Contact, Mark Complete)
✅ Mobile-responsive layout
✅ Real data integration

## File Location
```
apps/web/app/jobs/[id]/components/JobDetailsProfessional.tsx
```

## Integration Example

### Basic Usage (in page.tsx)
```tsx
import { JobDetailsProfessional } from './components/JobDetailsProfessional';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUserFromCookies();

  // Fetch job data
  const { data: job } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  // Fetch property
  const { data: property } = job.property_id
    ? await serverSupabase
        .from('properties')
        .select('*')
        .eq('id', job.property_id)
        .single()
    : { data: null };

  // Fetch contractor (if assigned)
  const { data: contractor } = job.contractor_id
    ? await serverSupabase
        .from('users')
        .select('*')
        .eq('id', job.contractor_id)
        .single()
    : { data: null };

  // Fetch homeowner
  const { data: homeowner } = await serverSupabase
    .from('users')
    .select('*')
    .eq('id', job.user_id)
    .single();

  // Fetch bids
  const { data: bids } = await serverSupabase
    .from('bids')
    .select(`
      *,
      contractor:users!bids_contractor_id_fkey (*)
    `)
    .eq('job_id', resolvedParams.id);

  // Fetch photos
  const { data: photos } = await serverSupabase
    .from('job_attachments')
    .select('file_url')
    .eq('job_id', resolvedParams.id);

  return (
    <JobDetailsProfessional
      job={job}
      property={property}
      homeowner={homeowner}
      contractor={contractor}
      bids={bids}
      photos={photos?.map(p => p.file_url) || []}
      currentUserId={user.id}
      userRole={user.role}
    />
  );
}
```

## Props Interface

```typescript
interface JobDetailsProfessionalProps {
  job: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority?: string;
    budget: number;
    location: string;
    created_at: string;
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    scheduled_duration_hours?: number;
    contractor_id?: string;
  };
  property?: {
    id: string;
    property_name: string;
    address: string;
  } | null;
  homeowner?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone?: string;
    profile_image_url?: string;
  } | null;
  contractor?: {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    email: string;
    phone?: string;
    profile_image_url?: string;
    admin_verified?: boolean;
    license_number?: string;
  } | null;
  bids?: Array<{
    id: string;
    amount: number;
    description?: string;
    status: string;
    created_at: string;
    contractor: Contractor;
  }>;
  photos?: string[];
  currentUserId: string;
  userRole: 'homeowner' | 'contractor';
}
```

## Supported Job Statuses

- `posted` - Blue badge, "Open"
- `assigned` - Mint badge, "Assigned"
- `in_progress` - Gold badge, "In Progress"
- `review` - Purple badge, "In Review"
- `completed` - Green badge, "Completed"
- `cancelled` - Gray badge, "Cancelled"

## Supported Priority Levels

- `low` - Gray badge
- `medium` - Blue badge
- `high` - Amber badge
- `emergency` - Rose badge

## Design System

### Colors
- **Primary (Teal):** `#14B8A6` - Buttons, links, accents
- **Navy:** Text headings, dark elements
- **Mint:** Success states, verified badges
- **Gold:** Warning states, in-progress status

### Typography
- **H1:** 3xl (30px), font-semibold
- **H2:** xl (20px), font-semibold
- **H3:** lg (18px), font-semibold
- **Body:** base (16px), font-normal
- **Small:** sm (14px), font-normal

### Spacing
- Card padding: 32px (p-8)
- Section gaps: 24px (gap-6)
- Grid columns: 8-4 (lg:col-span-8 / lg:col-span-4)

### Components

#### StatusBadge
Status indicator with icon and color coding.

#### PriorityBadge
Priority level indicator.

#### InfoItem
Icon + label + value display for quick information.

#### ContentCard
White card with title and content area.

#### StatItem
Key-value pair for sidebar statistics.

#### UserCard
User profile card with avatar, name, and contact info.

#### BidCard
Contractor bid card with amount and actions.

#### ImageLightbox
Full-screen image viewer with navigation.

## Conditional Rendering

### Homeowner View
- Shows all bids
- Edit job button (if status is "posted")
- Mark complete button (if status is "in_progress")
- Property information
- Assigned contractor (if assigned)

### Contractor View
- Submit bid button (if status is "posted")
- Homeowner information
- Property information
- Contact homeowner button

## Action Buttons

### Edit Job
- Only visible to homeowner
- Only when job status is "posted"
- Links to `/jobs/${job.id}/edit`

### Submit Bid
- Only visible to contractors
- Only when job status is "posted"
- Links to `/contractor/bid/${job.id}`

### Mark Complete
- Only visible to homeowner
- Only when job status is "in_progress"
- Triggers completion flow

### Contact
- Available to both roles
- Opens messaging interface

## Responsive Behavior

### Mobile (< 1024px)
- Single column layout
- Sidebar moves below main content
- Full-width cards
- Touch-friendly buttons

### Tablet (1024px - 1280px)
- 2-column grid activates
- Sidebar becomes sticky
- Optimized spacing

### Desktop (> 1280px)
- Full layout with sticky sidebar
- Maximum width constrained to 1280px
- Centered content with side margins

## CSS Requirements

Add these button styles to your global CSS:

```css
.btn-primary {
  @apply px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-sm hover:shadow-md;
}

.btn-secondary {
  @apply px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200;
}
```

## Accessibility Features

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus states on all buttons
- Alt text on all images
- Color contrast WCAG AA compliant

## Performance Optimizations

- Next.js Image component for optimized images
- Priority loading for hero image
- Lazy loading for gallery images
- Conditional rendering to reduce bundle size

## Future Enhancements

- [ ] Print-friendly layout
- [ ] PDF export functionality
- [ ] Social sharing buttons
- [ ] Job duplication feature
- [ ] Save as template
- [ ] Activity timeline
- [ ] Comment/notes section
- [ ] File attachments display

## Support

For questions or issues, refer to the main design system documentation or contact the design team.
