# Professional Contractor Layout - Quick Reference Card

## 🎨 Color System (Copy-Paste Ready)

```tsx
/* Sidebar */
bg-slate-900       /* #1E293B - Main sidebar background */
border-slate-800   /* #1E293B - Borders and dividers */
text-white         /* #FFFFFF - Primary text */
text-slate-300     /* #CBD5E1 - Inactive nav items */
text-slate-400     /* #94A3B8 - Secondary text */

/* Teal Accents */
bg-teal-500        /* #14B8A6 - Primary actions */
bg-teal-600        /* #0D9488 - Hover states */
text-teal-400      /* #2DD4BF - Active nav text */
bg-teal-500/10     /* rgba(20,184,166,0.1) - Active nav bg */

/* Content Area */
bg-gray-50         /* #F9FAFB - Main content background */
bg-white           /* #FFFFFF - Cards */
text-gray-900      /* #111827 - Headings */
text-gray-600      /* #4B5563 - Body text */
border-gray-200    /* #E5E7EB - Card borders */
```

## 📏 Layout Measurements

```
Sidebar Width:     w-64 (256px)
Header Height:     h-16 (64px)
Content Max-Width: max-w-7xl (1280px)
Content Padding:   p-8 on lg, p-4 on mobile
Card Padding:      p-6 (24px)
Card Gap:          gap-6 (24px)
```

## 🎯 Common Patterns

### Page Structure
```tsx
<div className="space-y-6">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Page Title</h2>
      <p className="text-gray-600 mt-1">Description</p>
    </div>
    <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">
      Action
    </button>
  </div>

  {/* Content */}
  {children}
</div>
```

### Stat Card
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">Label</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">Value</p>
    </div>
    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
      <Icon className="w-6 h-6 text-teal-600" />
    </div>
  </div>
  <div className="mt-4 flex items-center text-sm">
    <span className="text-green-600 font-medium">↑ 12%</span>
    <span className="text-gray-600 ml-2">vs last month</span>
  </div>
</div>
```

### Content Card
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Title</h3>
  {/* Content */}
</div>
```

### Button - Primary
```tsx
<button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors">
  Button Text
</button>
```

### Button - Secondary
```tsx
<button className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg border border-gray-300 transition-colors">
  Button Text
</button>
```

### Badge - Status
```tsx
<span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">
  Active
</span>
```

## 📱 Responsive Grid

```tsx
/* 1 column mobile, 2 tablet, 3 desktop */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>

/* 1 column mobile, 2 tablet, 4 desktop */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Stats */}
</div>

/* 2/3 + 1/3 split on desktop */
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">{/* Main content */}</div>
  <div>{/* Sidebar */}</div>
</div>
```

## 🎭 Icon Sizes

```tsx
w-4 h-4    /* 16px - Small icons (buttons) */
w-5 h-5    /* 20px - Navigation icons */
w-6 h-6    /* 24px - Card icons */
w-8 h-8    /* 32px - Logo */
```

## 🔤 Typography Scale

```tsx
text-xs    /* 12px - Labels, captions */
text-sm    /* 14px - Body text, nav items */
text-base  /* 16px - Default body */
text-lg    /* 18px - Card titles */
text-xl    /* 20px - Section headers */
text-2xl   /* 24px - Page titles */
text-3xl   /* 30px - Large numbers/stats */

font-normal     /* 400 - Body text */
font-medium     /* 500 - Navigation, buttons */
font-semibold   /* 600 - Card headers */
font-bold       /* 700 - Page titles */
```

## 🎬 Transitions

```tsx
/* Standard transition */
transition-colors duration-200

/* Transform transition */
transition-all duration-200

/* Hover scale */
hover:scale-105 transition-transform duration-200
```

## 🏗️ Adding Navigation Item

```tsx
// In navSections array:
{
  name: 'SECTION NAME',
  items: [
    {
      label: 'Page Name',
      href: '/contractor/page-name',
      icon: IconName,
      badge: 5, // Optional
      children: [ // Optional, for expandable items
        { label: 'Sub Item', href: '/contractor/page-name/sub', icon: IconName }
      ]
    }
  ]
}
```

## 🔧 Common Tasks

### Change Primary Color
```tsx
/* Find and replace in ProfessionalContractorLayout.tsx */
teal-500 → purple-500
teal-600 → purple-600
teal-400 → purple-400
teal-100 → purple-100
```

### Adjust Sidebar Width
```tsx
w-64 → w-72
lg:ml-64 → lg:ml-72
```

### Change Content Max Width
```tsx
max-w-7xl → max-w-6xl
```

## 📊 Status Badge Colors

```tsx
/* Success/Active */
bg-green-100 text-green-800

/* Warning/Pending */
bg-yellow-100 text-yellow-800

/* Info/In Progress */
bg-blue-100 text-blue-800

/* Error/Cancelled */
bg-red-100 text-red-800

/* Neutral/Draft */
bg-gray-100 text-gray-800
```

## 🎨 Gradient Backgrounds

```tsx
/* Teal Gradient (Primary) */
bg-gradient-to-r from-teal-500 to-teal-600

/* Blue-Teal Gradient */
bg-gradient-to-r from-blue-500 to-teal-500

/* Teal-Emerald Gradient */
bg-gradient-to-r from-teal-500 to-emerald-500

/* Avatar Gradient */
bg-gradient-to-br from-teal-500 to-teal-600
```

## 📦 Shadow System

```tsx
shadow       /* Default card shadow */
shadow-lg    /* Prominent card shadow */
shadow-xl    /* Hover state shadow */
shadow-2xl   /* Modal/dropdown shadow */
shadow-sm    /* Subtle border shadow */
```

## 🎯 Z-Index Layers

```
z-1   /* Default content */
z-30  /* Header */
z-40  /* Mobile overlay */
z-50  /* Sidebar */
```

## 🔍 Breakpoints

```tsx
/* Default (mobile first) */
className="px-4"

/* Tablet (768px+) */
className="md:px-6"

/* Desktop (1024px+) */
className="lg:px-8"

/* Large Desktop (1280px+) */
className="xl:px-12"
```

## 🎪 Animation Classes

```tsx
/* Fade in */
animate-fade-in

/* Slide up */
animate-slide-up

/* Scale bounce */
animate-scale-bounce

/* Rotate (for chevrons) */
rotate-180 transition-transform duration-200
```

## 📝 Form Elements

```tsx
/* Input Field */
<input
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
  type="text"
/>

/* Select Dropdown */
<select
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
>
  <option>Option</option>
</select>

/* Textarea */
<textarea
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
  rows={4}
/>
```

## 🏷️ Empty State Template

```tsx
<div className="bg-white rounded-lg shadow p-12 text-center">
  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
    <Icon className="w-8 h-8 text-gray-400" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Items Yet</h3>
  <p className="text-gray-600 mb-6">Get started by creating your first item.</p>
  <button className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600">
    Create New
  </button>
</div>
```

## 🔔 Notification Types

```tsx
/* Success */
<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
  <CheckCircle className="w-5 h-5 text-green-600" />
  <p className="text-sm text-green-800">Success message</p>
</div>

/* Error */
<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
  <AlertCircle className="w-5 h-5 text-red-600" />
  <p className="text-sm text-red-800">Error message</p>
</div>

/* Warning */
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
  <AlertCircle className="w-5 h-5 text-amber-600" />
  <p className="text-sm text-amber-800">Warning message</p>
</div>

/* Info */
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
  <Info className="w-5 h-5 text-blue-600" />
  <p className="text-sm text-blue-800">Info message</p>
</div>
```

## 🔗 Quick Links

### Files
- Layout: `apps/web/app/contractor/components/ProfessionalContractorLayout.tsx`
- Examples: `apps/web/app/contractor/components/COMPONENT_EXAMPLES.tsx`
- Guide: `apps/web/app/contractor/components/PROFESSIONAL_LAYOUT_GUIDE.md`
- Specs: `apps/web/app/contractor/components/VISUAL_SPECS.md`

### Routes
- Dashboard: `/contractor/dashboard-enhanced`
- Discover: `/contractor/discover`
- Jobs: `/contractor/jobs`
- Messages: `/contractor/messages`
- Settings: `/settings`

## 💡 Pro Tips

1. **Use `space-y-6`** for consistent vertical spacing
2. **Always add hover states** to interactive elements
3. **Use semantic HTML** (nav, aside, main, header)
4. **Test on mobile first**, then desktop
5. **Keep card shadows subtle** (shadow, not shadow-2xl)
6. **Use rounded-lg** for consistency (8px)
7. **Prefer transitions** over abrupt changes
8. **Add loading states** for async operations
9. **Include empty states** for zero-data scenarios
10. **Follow the 8px spacing grid**

## 🚀 Getting Started (3 Steps)

1. **Use the layout** (already applied to /contractor/*)
2. **Copy component from examples**
3. **Customize with design tokens**

Done! 🎉

---

**Print this card and keep it handy while developing!**
