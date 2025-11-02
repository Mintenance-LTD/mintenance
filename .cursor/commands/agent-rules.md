# agent-rules

# AGENTS.md

## Purpose

This document defines coding standards, architectural constraints, and expectations for AI agents working on this codebase. Following these guidelines ensures consistency, maintainability, and alignment with project goals.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Runtime**: Node.js

## Style & Conventions

### TypeScript

#### General Rules

- **Strict mode enabled**: All TypeScript strict checks must pass
- **No any types**: Use `unknown` or proper types instead
- **Explicit return types**: Always declare return types for functions
- **Interface over Type**: Prefer `interface` for object shapes, `type` for unions/intersections

```typescript
// ✅ DO
interface UserProps {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<UserProps> {
  // implementation
}

// ❌ DON'T
function getUser(id: any) {
  // implementation
}
```

#### Naming Conventions

- **Files**: kebab-case (user-profile.tsx, api-client.ts)
- **Components**: PascalCase (UserProfile, NavigationBar)
- **Functions/Variables**: camelCase (getUserData, isAuthenticated)
- **Constants**: SCREAMING_SNAKE_CASE (API_BASE_URL, MAX_RETRY_COUNT)
- **Types/Interfaces**: PascalCase (UserData, ApiResponse)
- **Private properties**: prefix with underscore (_internalState)

```typescript
// ✅ DO
const API_ENDPOINT = 'https://api.example.com';
const userData = await fetchUserData();

interface ApiResponse<T> {
  data: T;
  status: number;
}

// ❌ DON'T
const api_endpoint = 'https://api.example.com';
const UserData = await fetchUserData();
```

### React 19 Conventions

#### Component Structure

- **Use function components**: No class components
- **Server Components by default**: Use 'use client' only when necessary
- **Named exports for components**: Avoid default exports except for pages

```typescript
// ✅ DO - Server Component (default in Next.js 15)
interface UserCardProps {
  user: UserProps;
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-xl font-semibold">{user.name}</h2>
      <p className="text-gray-600">{user.email}</p>
    </div>
  );
}

// ✅ DO - Client Component (when needed)
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}

// ❌ DON'T - Unnecessary client component
'use client'; // Not needed if no interactivity

export function StaticCard({ title }: { title: string }) {
  return <div>{title}</div>;
}
```

#### Hooks Best Practices

- **Custom hooks**: Prefix with `use` (useUserData, useDebounce)
- **Hook dependencies**: Always include all dependencies in arrays
- **Avoid inline functions in JSX**: Extract to separate functions or useCallback

```typescript
// ✅ DO
function useUserData(userId: string) {
  const [user, setUser] = useState<UserProps | null>(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // All dependencies listed
  
  return user;
}

// ❌ DON'T
function useUserData(userId: string) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, []); // Missing userId dependency
  
  return user;
}
```

### Next.js 15 App Router

#### File Structure

- **Route groups**: Use (group-name) for organization without affecting URLs
- **Private folders**: Prefix with `_` to exclude from routing
- **Colocation**: Keep related components near their routes

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/
│   ├── _components/
│   │   └── sidebar.tsx
│   └── page.tsx
└── api/
    └── users/
        └── route.ts
```

#### Data Fetching

- **Server Components**: Fetch directly in components
- **Use fetch with caching**: Leverage Next.js cache by default
- **Streaming**: Use loading.tsx and Suspense boundaries
- **Error handling**: Implement error.tsx boundaries

```typescript
// ✅ DO - Server Component data fetching
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await fetch(`https://api.example.com/users/${params.id}`, {
    next: { revalidate: 3600 } // Cache for 1 hour
  }).then(res => res.json());

  return <UserProfile user={user} />;
}

// ❌ DON'T - Using client-side fetching unnecessarily
'use client';
import { useEffect, useState } from 'react';

export default function UserPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(`https://api.example.com/users/${params.id}`)
      .then(res => res.json())
      .then(setUser);
  }, [params.id]);

  return user ? <UserProfile user={user} /> : <div>Loading...</div>;
}
```

#### Server Actions

- **Use 'use server'**: Mark server-only functions
- **Return serializable data**: No functions, classes, or Date objects
- **Validation**: Always validate input on the server

```typescript
// ✅ DO
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function createUser(formData: FormData) {
  const data = userSchema.parse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  const user = await db.user.create({ data });
  revalidatePath('/users');
  
  return { success: true, userId: user.id };
}

// ❌ DON'T - Missing validation
'use server';

export async function createUser(formData: FormData) {
  const user = await db.user.create({
    data: {
      name: formData.get('name'), // No validation!
      email: formData.get('email'),
    }
  });
  
  return user; // Returning database model directly
}
```

### Tailwind CSS

#### Class Organization

- **Order**: Layout → Spacing → Sizing → Typography → Visual → State
- **Use cn() helper**: For conditional classes
- **Avoid arbitrary values**: Use theme values when possible

```typescript
import { cn } from '@/lib/utils';

// ✅ DO
<div className={cn(
  "flex items-center justify-between", // Layout
  "gap-4 p-4", // Spacing
  "w-full max-w-md", // Sizing
  "text-lg font-semibold", // Typography
  "bg-white rounded-lg shadow-sm", // Visual
  "hover:bg-gray-50 focus:outline-none focus:ring-2", // State
  isActive && "ring-2 ring-blue-500"
)} />

// ❌ DON'T - Random order, arbitrary values
<div className="bg-white text-lg hover:bg-gray-50 rounded-lg w-full p-4 flex shadow-sm items-center focus:outline-none gap-4 justify-between font-semibold max-w-md focus:ring-2" style={{ padding: '17px' }} />
```

#### Component Styling

- **Extract repeated patterns**: Create reusable components
- **Use CSS variables**: For theme-aware colors
- **Mobile-first**: Start with mobile, add md:, lg: breakpoints

```typescript
// ✅ DO
const buttonVariants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  ghost: "bg-transparent hover:bg-gray-100",
};

export function Button({ variant = 'primary', children }: ButtonProps) {
  return (
    <button className={cn(
      "px-4 py-2 rounded-md font-medium transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      buttonVariants[variant]
    )}>
      {children}
    </button>
  );
}

// ❌ DON'T - Inline repeated styles everywhere
<button className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md">
  Click me
</button>
```

## Architectural Constraints

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route group
│   ├── (dashboard)/       # Route group
│   └── api/               # API routes
├── components/            # Shared components
│   ├── ui/               # Base UI components
│   └── features/         # Feature-specific components
├── lib/                   # Utilities and helpers
│   ├── utils.ts          # General utilities
│   ├── api-client.ts     # API client
│   └── validations.ts    # Zod schemas
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── config/               # Configuration files
```

### Design Patterns

#### Separation of Concerns

- **Presentation vs Logic**: Keep business logic separate from UI
- **Server vs Client**: Minimize client-side JavaScript
- **Data layer**: Centralize API calls and data fetching

```typescript
// ✅ DO - Separate concerns
// lib/api/users.ts
export async function fetchUsers(): Promise<UserProps[]> {
  const response = await fetch('https://api.example.com/users');
  return response.json();
}

// app/users/page.tsx
import { fetchUsers } from '@/lib/api/users';

export default async function UsersPage() {
  const users = await fetchUsers();
  return <UserList users={users} />;
}

// ❌ DON'T - Mix concerns
export default async function UsersPage() {
  const response = await fetch('https://api.example.com/users');
  const users = await response.json();
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          {user.name} - {user.email}
          <button onClick={() => {
            fetch(`/api/users/${user.id}`, { method: 'DELETE' });
          }}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### Composition over Inheritance

- **Use composition**: Build complex components from simpler ones
- **Props drilling**: Avoid deep nesting; use composition or context

```typescript
// ✅ DO
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-lg border bg-white p-6", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: CardHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

export function CardTitle({ children }: CardTitleProps) {
  return <h3 className="text-xl font-semibold">{children}</h3>;
}

// Usage
<Card>
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

// ❌ DON'T - Inheritance or complex props
export class BaseCard extends React.Component {
  // Don't use classes
}

export function Card({ 
  title, 
  subtitle, 
  content, 
  footer, 
  headerAction,
  showDivider,
  // ...20 more props
}: ComplexCardProps) {
  // Too many props, use composition
}
```

#### State Management

- **Server state**: Use React Query or SWR for caching
- **URL state**: Store in searchParams when possible
- **Local state**: useState for component-local state
- **Global state**: Context API or Zustand (avoid Redux unless necessary)

```typescript
// ✅ DO - URL state for filters
export default function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string };
}) {
  const products = await fetchProducts({
    category: searchParams.category,
    sort: searchParams.sort,
  });

  return <ProductList products={products} />;
}

// ❌ DON'T - Client state for URL-worthy data
'use client';

export default function ProductsPage() {
  const [category, setCategory] = useState('all');
  const [products, setProducts] = useState([]);
  
  // This should be in URL and fetched server-side
}
```

#### Error Handling

- **Always handle errors**: Don't leave try-catch empty
- **User-friendly messages**: Show meaningful errors
- **Logging**: Log errors for debugging

```typescript
// ✅ DO
try {
  const data = await fetchUserData(userId);
  return data;
} catch (error) {
  console.error('Failed to fetch user data:', error);
  
  if (error instanceof ApiError) {
    throw new Error(`Unable to load user: ${error.message}`);
  }
  
  throw new Error('An unexpected error occurred. Please try again.');
}

// ❌ DON'T
try {
  const data = await fetchUserData(userId);
  return data;
} catch (error) {
  // Silent failure
}
```

## Specific Dos and Don'ts

### Performance

✅ **DO**

- Use Server Components by default
- Implement proper loading states with Suspense
- Optimize images with `next/image`
- Lazy load heavy components
- Minimize client-side JavaScript

```typescript
import Image from 'next/image';
import { Suspense } from 'react';

export default function ProfilePage() {
  return (
    <div>
      <Image
        src="/avatar.jpg"
        alt="User avatar"
        width={200}
        height={200}
        priority
      />
      
      <Suspense fallback={<LoadingSkeleton />}>
        <UserPosts userId={userId} />
      </Suspense>
    </div>
  );
}
```

❌ **DON'T**

- Add 'use client' without checking if needed
- Use `<img>` tags directly
- Fetch data client-side when server-side is possible
- Import large libraries in client components

### Accessibility

✅ **DO**

- Use semantic HTML
- Add ARIA labels when necessary
- Ensure keyboard navigation
- Maintain color contrast ratios

```typescript
<button
  type="button"
  aria-label="Close dialog"
  onClick={onClose}
  className="focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <XIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

❌ **DON'T**

- Use div/span for interactive elements
- Forget alt text on images
- Remove focus indicators

### Security

✅ **DO**

- Validate all user input
- Sanitize data before rendering
- Use environment variables for secrets
- Implement proper authentication checks

```typescript
'use server';

import { z } from 'zod';

const userInputSchema = z.object({
  email: z.string().email(),
  age: z.number().min(13).max(120),
});

export async function submitForm(input: unknown) {
  const validated = userInputSchema.parse(input);
  // Now safe to use validated data
}
```

❌ **DON'T**

- Trust client-side validation alone
- Expose API keys in client code
- Use dangerouslySetInnerHTML without sanitization

### Testing

✅ **DO**

- Write unit tests for utilities
- Test components with user interactions
- Use TypeScript to catch errors early
- Test error states

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LoginForm', () => {
  it('should show error on invalid email', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);
    
    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
  });
});
```

## Additional Guidelines

### Comments

- **Explain WHY, not WHAT**: Code should be self-documenting
- **Document complex logic**: Add comments for non-obvious behavior
- **JSDoc for public APIs**: Use JSDoc for exported functions

```typescript
// ✅ DO
/**
 * Calculates the total price including tax and discounts.
 * @param items - Array of cart items
 * @param taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @returns Total price in cents to avoid floating point errors
 */
export function calculateTotal(items: CartItem[], taxRate: number): number {
  // Using cents to avoid floating point arithmetic issues
  const subtotal = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
  return Math.round(subtotal * (1 + taxRate));
}

// ❌ DON'T
// This function calculates the total
export function calculateTotal(items: CartItem[], taxRate: number): number {
  // Loop through items
  const subtotal = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
  // Return total
  return Math.round(subtotal * (1 + taxRate));
}
```

### Git Commits

- **Use conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`
- **Keep commits atomic and focused**
- **Write clear, descriptive messages**

## Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

