# @mintenance/ui

A shared UI component library for Mintenance applications.

## Features

- 🎨 Consistent design system
- 📱 Responsive components
- ♿ Accessible by default
- 🎯 TypeScript support
- 🚀 Tree-shakeable
- 🎨 Tailwind CSS integration

## Installation

```bash
npm install @mintenance/ui
```

## Usage

```tsx
import { Button, Input, Card, Badge } from '@mintenance/ui';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Input label="Email" placeholder="Enter your email" />
        <Button variant="primary">Submit</Button>
      </CardContent>
    </Card>
  );
}
```

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
<Button variant="primary" size="md" loading={false}>
  Click me
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- `disabled`: boolean

### Input

A form input component with label, error, and helper text support.

```tsx
<Input
  label="Email"
  placeholder="Enter your email"
  error="Invalid email"
  helperText="We'll never share your email"
/>
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `leftIcon`: ReactNode
- `rightIcon`: ReactNode

### Card

A container component for grouping related content.

```tsx
<Card variant="outlined" padding="md">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

**Props:**
- `variant`: 'default' | 'outlined' | 'elevated'
- `padding`: 'none' | 'sm' | 'md' | 'lg'

### Badge

A small status indicator component.

```tsx
<Badge variant="success" size="md">
  Active
</Badge>
```

**Props:**
- `variant`: 'default' | 'success' | 'warning' | 'error' | 'info'
- `size`: 'sm' | 'md' | 'lg'

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test
```

## Contributing

1. Create a new branch
2. Make your changes
3. Add tests if applicable
4. Run the build and tests
5. Submit a pull request

## License

MIT
