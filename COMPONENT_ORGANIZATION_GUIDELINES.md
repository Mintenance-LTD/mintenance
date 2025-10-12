# Component Organization Guidelines

**Date**: October 11, 2025  
**Purpose**: Standardize component organization across the Mintenance codebase

---

## 📋 Overview

This document establishes the standard patterns for organizing components in both web and mobile applications. Following these guidelines ensures consistency, maintainability, and scalability across the codebase.

---

## 🎯 Core Principles

### 1. **Single Responsibility Principle**
- Each component should have ONE clear purpose
- If a component does multiple things, split it
- Components should be independently testable and reusable

### 2. **File Size Limits**
- ✅ **Target**: < 200 lines per file
- ⚠️ **Warning**: 200-400 lines (consider refactoring)
- 🔴 **Critical**: 400-500 lines (MUST refactor soon)
- 🚨 **Violation**: > 500 lines (IMMEDIATE refactoring required)

### 3. **Naming Conventions**
- **Components**: `PascalCase.tsx` (e.g., `ContractorCard.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Hooks**: `useCamelCase.ts` (e.g., `useAuth.ts`)
- **Types**: `types.ts` or inline with component
- **Services**: `PascalCaseService.ts` (e.g., `AuthService.ts`)

---

## 📁 Standard Folder Structure

### Web Application (Next.js)

```
app/
├── feature-name/
│   ├── page.tsx                 # Main page component
│   ├── layout.tsx              # Optional feature layout
│   ├── loading.tsx             # Loading state
│   ├── error.tsx               # Error boundary
│   │
│   └── components/             # Feature-specific components
│       ├── FeatureClient.tsx   # Main client component
│       ├── FeatureHeader.tsx   # Header component
│       ├── FeatureList.tsx     # List component
│       ├── FeatureItem.tsx     # Item component
│       ├── FeatureModal.tsx    # Modal component
│       └── index.ts            # Optional barrel exports
│
└── components/                  # Shared components
    ├── ui/                     # Generic UI primitives
    ├── layouts/                # Layout components
    └── feature-domain/         # Shared domain components
```

### Mobile Application (React Native)

```
src/screens/
├── feature-name/
│   ├── FeatureScreen.tsx       # Main screen component
│   │
│   ├── components/             # Screen-specific components
│   │   ├── FeatureHeader.tsx
│   │   ├── FeatureList.tsx
│   │   ├── FeatureItem.tsx
│   │   └── index.ts
│   │
│   └── viewmodels/            # Business logic layer
│       └── FeatureViewModel.ts
│
src/components/                 # Shared components
├── common/                    # Common UI components
├── cards/                     # Card components
└── forms/                     # Form components
```

---

## ✅ Component Organization Patterns

### Pattern 1: Simple Page (< 200 lines)

**When to use**: Page has minimal complexity

```typescript
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      {/* Simple content */}
    </div>
  );
}
```

**Characteristics**:
- No sub-components needed
- Self-contained
- Minimal logic

---

### Pattern 2: Page with Components (200-500 lines split)

**When to use**: Page has moderate complexity

```
app/dashboard/
├── page.tsx                   # ~50 lines - orchestrator
└── components/
    ├── DashboardStats.tsx     # ~80 lines
    ├── DashboardChart.tsx     # ~120 lines
    └── DashboardActions.tsx   # ~60 lines
```

```typescript
// app/dashboard/page.tsx
import { DashboardStats } from './components/DashboardStats';
import { DashboardChart } from './components/DashboardChart';
import { DashboardActions } from './components/DashboardActions';

export default function DashboardPage() {
  return (
    <div>
      <DashboardStats />
      <DashboardChart />
      <DashboardActions />
    </div>
  );
}
```

**Characteristics**:
- Main page is thin orchestrator
- Components are feature-specific
- Clear separation of concerns

---

### Pattern 3: Complex Feature with Sub-components

**When to use**: Feature has high complexity (e.g., Discover page)

```
app/discover/
├── page.tsx                          # ~30 lines - data fetching
└── components/
    ├── DiscoverClient.tsx            # ~100 lines - main orchestrator
    ├── DiscoverHeader.tsx            # ~80 lines
    ├── DiscoverEmptyState.tsx        # ~50 lines
    ├── CardStack.tsx                 # ~60 lines
    ├── SwipeActionButtons.tsx        # ~120 lines
    ├── JobCard.tsx                   # ~130 lines
    └── ContractorCard.tsx            # ~200 lines
```

```typescript
// app/discover/page.tsx (Server Component)
export default async function DiscoverPage() {
  const data = await fetchData();
  return <DiscoverClient {...data} />;
}

// app/discover/components/DiscoverClient.tsx (Client Component)
'use client';

import { DiscoverHeader } from './DiscoverHeader';
import { CardStack } from './CardStack';
// ... other imports

export function DiscoverClient({ data }) {
  // State management
  // Event handlers
  
  return (
    <>
      <DiscoverHeader />
      <CardStack />
      {/* ... other components */}
    </>
  );
}
```

**Characteristics**:
- Server component handles data
- Client component handles interactivity
- Multiple sub-components for UI sections
- Each component has single responsibility

---

## 🎨 Component Types & Responsibilities

### 1. **Page Components** (`page.tsx`)
- **Responsibility**: Data fetching, route handling
- **Size**: 20-50 lines
- **Type**: Server Component (Next.js default)
- **Contains**: Data fetching, props passing to client components

```typescript
// Good example
export default async function ProfilePage({ params }) {
  const user = await getCurrentUser();
  const profile = await fetchProfile(params.id);
  
  return <ProfileClient user={user} profile={profile} />;
}
```

### 2. **Client Components** (`*Client.tsx`)
- **Responsibility**: Interactivity, state management
- **Size**: 50-150 lines
- **Type**: Client Component (`'use client'`)
- **Contains**: useState, useEffect, event handlers, UI orchestration

```typescript
'use client';

export function ProfileClient({ user, profile }) {
  const [editing, setEditing] = useState(false);
  
  return (
    <>
      <ProfileHeader onEdit={() => setEditing(true)} />
      <ProfileContent editing={editing} />
    </>
  );
}
```

### 3. **UI Components** (smaller parts)
- **Responsibility**: Display specific UI section
- **Size**: 30-200 lines
- **Contains**: Markup, styling, props handling

```typescript
export function ProfileHeader({ onEdit }) {
  return (
    <header>
      <h1>Profile</h1>
      <button onClick={onEdit}>Edit</button>
    </header>
  );
}
```

### 4. **Container Components** (complex orchestration)
- **Responsibility**: Compose multiple components, manage shared state
- **Size**: 100-200 lines
- **Contains**: Multiple child components, shared state/context

### 5. **Presentation Components** (pure UI)
- **Responsibility**: Display only, no logic
- **Size**: 20-100 lines
- **Contains**: JSX, styling, no state

---

## 📝 Component Documentation

Every component should have a JSDoc comment:

```typescript
/**
 * Profile header component
 * Displays user name, avatar, and edit button
 * 
 * @param user - User object with name and avatar
 * @param onEdit - Callback when edit button clicked
 */
export function ProfileHeader({ user, onEdit }: ProfileHeaderProps) {
  // Implementation
}
```

---

## 🔄 Refactoring Triggers

Refactor when:

1. **File exceeds 400 lines**
2. **Component has multiple responsibilities**
3. **Difficult to understand/test**
4. **Repeated code across components**
5. **Deep nesting (> 3 levels)**

### Refactoring Steps:

1. **Identify sections** - Find logical boundaries
2. **Extract components** - Create new files
3. **Update imports** - Fix parent component
4. **Test** - Verify functionality unchanged
5. **Document** - Add JSDoc comments
6. **Update TODO** - Mark task complete

---

## 🎯 Real-World Examples

### ✅ Good Example: Discover Page (After Refactoring)

**Before**: 831 lines in one file  
**After**: 7 components, largest is 200 lines

```
discover/components/
├── DiscoverClient.tsx         # 95 lines ✅
├── DiscoverHeader.tsx         # 80 lines ✅
├── DiscoverEmptyState.tsx     # 50 lines ✅
├── CardStack.tsx              # 60 lines ✅
├── SwipeActionButtons.tsx     # 120 lines ✅
├── JobCard.tsx                # 130 lines ✅
└── ContractorCard.tsx         # 200 lines ✅
```

**Benefits**:
- Easy to understand each component
- Easy to test in isolation
- Easy to reuse components
- Easy to modify without breaking others

### ✅ Good Example: Landing Page (After Refactoring)

**Before**: 618 lines in one file  
**After**: 7 section components

```
components/landing/
├── LandingNavigation.tsx      # 60 lines ✅
├── HeroSection.tsx            # 140 lines ✅
├── StatsSection.tsx           # 30 lines ✅
├── HowItWorksSection.tsx      # 120 lines ✅
├── ServicesSection.tsx        # 60 lines ✅
├── FeaturesSection.tsx        # 80 lines ✅
├── CTASection.tsx             # 50 lines ✅
└── FooterSection.tsx          # 90 lines ✅

page.tsx                        # 35 lines ✅
```

---

## 🚫 Anti-Patterns to Avoid

### ❌ God Components
```typescript
// BAD: 1000 lines, does everything
export function MassiveDashboard() {
  // 1000 lines of mixed concerns
}
```

### ❌ Nested Component Definitions
```typescript
// BAD: Defining components inside components
export function Parent() {
  const Child = () => <div>Child</div>; // ❌ Don't do this
  return <Child />;
}

// GOOD: Separate component files
export function Parent() {
  return <Child />;
}
```

### ❌ Mixed Server/Client Logic
```typescript
// BAD: Mixing server and client in one file
'use client';

async function serverFunction() { // ❌ Can't use server features in client component
  const data = await fetch('/api');
}
```

### ❌ Unclear Names
```typescript
// BAD
<Helper1 />
<Temp />
<Data />

// GOOD
<ProfileHeader />
<LoadingSpinner />
<UserStatistics />
```

---

## ✅ Checklist for New Components

Before committing a component, verify:

- [ ] Component name is descriptive and follows PascalCase
- [ ] File size is under 500 lines (ideally under 200)
- [ ] Component has single, clear responsibility
- [ ] JSDoc comment explains purpose
- [ ] Props are typed (TypeScript interface)
- [ ] No nested component definitions
- [ ] Server/client boundary is clear
- [ ] Component is placed in correct directory
- [ ] Imports are organized (React, external, internal)
- [ ] Component is testable in isolation

---

## 📊 Component Size Guidelines

| Lines | Status | Action |
|-------|--------|--------|
| < 100 | ✅ Excellent | Perfect size |
| 100-200 | ✅ Good | Acceptable |
| 200-300 | ⚠️ Warning | Consider splitting |
| 300-400 | 🟡 Caution | Should split soon |
| 400-500 | 🔴 Critical | Must split |
| > 500 | 🚨 **VIOLATION** | Immediate refactoring required |

---

## 🔧 Tools & Commands

### Check file sizes:
```bash
# Find files over 400 lines
find apps/web/app -name "*.tsx" -exec wc -l {} \; | sort -rn | head -20

# Find files over 500 lines (violations)
find apps/web/app -name "*.tsx" -exec wc -l {} \; | awk '$1 > 500 { print $0 }'
```

### Lint component organization:
```bash
# Run ESLint
npm run lint

# Type check
npm run type-check
```

---

## 📚 Additional Resources

- [React Component Composition](https://react.dev/learn/thinking-in-react)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [Component Driven Development](https://componentdriven.org/)

---

## 🎓 Training & Onboarding

New developers should:
1. Read this document thoroughly
2. Review refactored examples (Discover, Landing pages)
3. Practice refactoring a small component
4. Get code review before merging

---

**Last Updated**: October 11, 2025  
**Maintained By**: Development Team  
**Status**: ✅ Active Guidelines

