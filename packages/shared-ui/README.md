# @mintenance/shared-ui

Shared UI component library for Mintenance web and mobile applications.

## Overview

This package provides reusable, platform-agnostic UI components that work across both web (Next.js) and mobile (React Native) platforms. All components follow the modern design system with consistent styling, animations, and behavior.

## Installation

```bash
npm install @mintenance/shared-ui
```

## Components

### StatusBadge

A flexible status badge component with automatic color coding based on status type.

**Props:**
- `status` (string, required): The status to display
- `size` ('sm' | 'md' | 'lg', optional): Badge size, defaults to 'md'

**Supported Statuses:**
- Completed: `completed`, `approved`, `accepted`, `paid`
- In Progress: `in_progress`, `on_going`, `assigned`
- Pending: `pending`, `in_review`
- Open: `posted`, `open`, `sent`
- Delayed: `delayed`, `at_risk`, `overdue`
- Draft: `draft`
- Cancelled: `cancelled`, `declined`
- Active/Inactive: `active`, `inactive`

**Usage:**
```tsx
import { StatusBadge } from '@mintenance/shared-ui';

<StatusBadge status="completed" size="md" />
<StatusBadge status="in_progress" size="sm" />
```

---

### MetricCard

Displays a single metric with optional icon, subtitle, and trend indicator.

**Props:**
- `label` (string, required): The metric label
- `value` (string, required): The metric value to display
- `subtitle` (string, optional): Additional context below the value
- `icon` (string, optional): Emoji or icon character
- `color` (string, optional): Accent color, defaults to '#10B981'
- `trend` (object, optional): Trend data with `value` (number) and `isPositive` (boolean)

**Usage:**
```tsx
import { MetricCard } from '@mintenance/shared-ui';

<MetricCard
  label="Total Revenue"
  value="$12,500"
  subtitle="This month"
  icon="💰"
  color="#10B981"
  trend={{ value: 12.5, isPositive: true }}
/>
```

---

### DataTable

A generic table component with TypeScript generics for type-safe rendering.

**Props:**
- `data` (T[], required): Array of data items
- `columns` (Column<T>[], required): Column definitions
- `onRowClick` ((item: T) => void, optional): Row click handler
- `emptyMessage` (string, optional): Message when no data
- `title` (string, optional): Table title
- `actions` (ReactNode, optional): Action buttons in header

**Column Definition:**
```tsx
interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}
```

**Usage:**
```tsx
import { DataTable, Column } from '@mintenance/shared-ui';

interface Job {
  id: string;
  title: string;
  budget: number;
  status: string;
}

const columns: Column<Job>[] = [
  { key: 'title', label: 'Job Title' },
  {
    key: 'budget',
    label: 'Budget',
    render: (job) => `$${job.budget.toLocaleString()}`,
    align: 'right',
  },
  {
    key: 'status',
    label: 'Status',
    render: (job) => <StatusBadge status={job.status} />,
    align: 'center',
  },
];

<DataTable
  data={jobs}
  columns={columns}
  onRowClick={(job) => console.log(job)}
  title="Recent Jobs"
/>
```

---

### CircularProgress

An animated circular progress indicator with percentage display.

**Props:**
- `value` (number, required): Progress value (0-100)
- `size` (number, optional): Circle diameter in pixels, defaults to 200
- `strokeWidth` (number, optional): Stroke width in pixels, defaults to 12
- `label` (string, optional): Label text, defaults to 'Completed'
- `showPercentage` (boolean, optional): Show percentage text, defaults to true

**Color Coding:**
- 75-100%: Green (#10B981)
- 50-74%: Yellow (#F59E0B)
- 25-49%: Red (#EF4444)
- 0-24%: Gray (#9CA3AF)

**Usage:**
```tsx
import { CircularProgress } from '@mintenance/shared-ui';

<CircularProgress
  value={85}
  size={180}
  strokeWidth={14}
  label="Profile Completion"
  showPercentage={true}
/>
```

---

### Icon

A comprehensive icon component with SVG paths for common icons.

**Props:**
- `name` (string, required): Icon name
- `size` (number, optional): Icon size in pixels, defaults to 20
- `color` (string, optional): Icon color, defaults to 'currentColor'
- `className` (string, optional): CSS class name
- `style` (React.CSSProperties, optional): Inline styles

**Available Icons:**
- **Common:** check, x, plus, minus, search
- **Navigation:** home, dashboard
- **Status:** checkCircle, xCircle, alert, info
- **Business:** briefcase, currencyDollar, creditCard
- **Location:** mapPin, map
- **UI:** star, clock, calendar, document, messages, profile, settings, refresh, image

**Usage:**
```tsx
import { Icon } from '@mintenance/shared-ui';

<Icon name="check" size={24} color="#10B981" />
<Icon name="briefcase" size={32} color="#6366F1" />
```

---

## Design System

All components follow these design principles:

### Border Radius
- **Cards:** 20px
- **Buttons/Badges:** 12px
- **Small elements:** 8px

### Spacing
- Consistent spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48px

### Colors
- **Primary:** #6366F1 (Indigo)
- **Success:** #10B981 (Green)
- **Warning:** #F59E0B (Amber)
- **Error:** #EF4444 (Red)
- **Text:** #1F2937 (Dark Gray)
- **Secondary Text:** #6B7280 (Gray)

### Animations
- **Hover Effects:** `translateY(-4px)` with shadow
- **Transitions:** 0.2s ease for smooth interactions
- **Progress:** 0.5s ease for value changes

## TypeScript Support

All components are fully typed with TypeScript and include comprehensive type definitions for props and generic parameters.

## Platform Compatibility

Components are designed to work on both:
- **Web:** Next.js 14+ with React 18+
- **Mobile:** React Native with Expo

## Examples

### Complete Dashboard Card
```tsx
import {
  MetricCard,
  DataTable,
  StatusBadge,
  Icon,
  Column,
} from '@mintenance/shared-ui';

function Dashboard() {
  const metrics = [
    { label: 'Total Jobs', value: '156', icon: '📋', trend: { value: 12, isPositive: true } },
    { label: 'Active Bids', value: '23', icon: '💼', trend: { value: 5, isPositive: true } },
    { label: 'Completed', value: '98', icon: '✅', trend: { value: 8, isPositive: false } },
  ];

  const jobs = [
    { id: '1', title: 'Kitchen Remodel', budget: 15000, status: 'in_progress' },
    { id: '2', title: 'Bathroom Repair', budget: 5000, status: 'completed' },
  ];

  const columns: Column<typeof jobs[0]>[] = [
    { key: 'title', label: 'Job' },
    {
      key: 'budget',
      label: 'Budget',
      render: (job) => `$${job.budget.toLocaleString()}`,
      align: 'right',
    },
    {
      key: 'status',
      label: 'Status',
      render: (job) => <StatusBadge status={job.status} />,
      align: 'center',
    },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <DataTable
        data={jobs}
        columns={columns}
        title="Recent Jobs"
        onRowClick={(job) => console.log('Clicked:', job)}
      />
    </div>
  );
}
```

## Contributing

When adding new components:
1. Follow the existing design system
2. Include comprehensive TypeScript types
3. Add hover effects and transitions
4. Document props and usage examples
5. Ensure cross-platform compatibility

## License

MIT
