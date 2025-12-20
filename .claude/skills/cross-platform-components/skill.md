# Cross-Platform Components Skill

## Skill Overview
Expert knowledge for building cross-platform React components that work seamlessly on both Web (React) and Mobile (React Native) in the Mintenance platform. Covers platform-specific implementations, shared logic, and design system integration.

## Component Architecture Pattern

### Directory Structure

```
packages/shared-ui/src/components/ComponentName/
├── index.ts                    # Exports (platform-agnostic)
├── ComponentName.tsx           # Shared types & interface
├── ComponentName.web.tsx       # Web implementation
├── ComponentName.native.tsx    # React Native implementation
├── types.ts                    # Component-specific types
└── styles.ts                   # Shared style tokens (optional)
```

### Platform Resolution

**Webpack (Web)** resolves in this order:
1. `.web.tsx`
2. `.tsx`
3. `.ts`

**Metro (React Native)** resolves in this order:
1. `.native.tsx`
2. `.tsx`
3. `.ts`

## Standard Component Template

### 1. Shared Types (`types.ts`)

```typescript
// packages/shared-ui/src/components/Button/types.ts
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  // Content
  children: React.ReactNode;

  // Behavior
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;

  // Styling
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;

  // Accessibility
  accessibilityLabel?: string;
  testID?: string;

  // Platform-specific (optional)
  className?: string; // Web only
  style?: any; // React Native only
}
```

### 2. Shared Interface (`ComponentName.tsx`)

```typescript
// packages/shared-ui/src/components/Button/Button.tsx
import { ButtonProps } from './types';

// Export the type for external use
export type { ButtonProps };

// This file is typically just a re-export
// The actual implementation is in .web.tsx or .native.tsx
```

### 3. Web Implementation (`ComponentName.web.tsx`)

```typescript
// packages/shared-ui/src/components/Button/Button.web.tsx
import React from 'react';
import { ButtonProps } from './types';
import { cn } from '@/lib/utils'; // Tailwind class merger

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  accessibilityLabel,
  testID,
  className,
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  // Variant styles
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-500',
    outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-500',
    ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500',
  };

  // Size styles
  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  };

  // Full width
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled || loading}
      aria-label={accessibilityLabel}
      data-testid={testID}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        widthStyles,
        className
      )}
    >
      {loading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};
```

### 4. Native Implementation (`ComponentName.native.tsx`)

```typescript
// packages/shared-ui/src/components/Button/Button.native.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ButtonProps } from './types';

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  accessibilityLabel,
  testID,
  style,
}) => {
  // Get variant styles
  const variantButtonStyle = variantStyles.button[variant];
  const variantTextStyle = variantStyles.text[variant];

  // Get size styles
  const sizeButtonStyle = sizeStyles.button[size];
  const sizeTextStyle = sizeStyles.text[size];

  // Combine styles
  const buttonStyle: ViewStyle = [
    styles.button,
    variantButtonStyle,
    sizeButtonStyle,
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle;

  const textStyle: TextStyle = [
    styles.text,
    variantTextStyle,
    sizeTextStyle,
  ].filter(Boolean) as TextStyle;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={buttonStyle}
      activeOpacity={0.7}
    >
      {loading ? (
        <>
          <ActivityIndicator
            color={variant === 'primary' ? '#ffffff' : '#3b82f6'}
            size="small"
            style={styles.loader}
          />
          <Text style={textStyle}>Loading...</Text>
        </>
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

// Styles
const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  loader: {
    marginRight: 8,
  },
});

// Variant styles
const variantStyles = {
  button: {
    primary: {
      backgroundColor: '#3b82f6',
    },
    secondary: {
      backgroundColor: '#e5e7eb',
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: '#d1d5db',
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  },
  text: {
    primary: {
      color: '#ffffff',
    },
    secondary: {
      color: '#111827',
    },
    outline: {
      color: '#111827',
    },
    ghost: {
      color: '#111827',
    },
  },
};

// Size styles
const sizeStyles = {
  button: {
    sm: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    md: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    lg: {
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
  },
  text: {
    sm: {
      fontSize: 14,
    },
    md: {
      fontSize: 16,
    },
    lg: {
      fontSize: 18,
    },
  },
};
```

### 5. Index File (`index.ts`)

```typescript
// packages/shared-ui/src/components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './types';
```

## Design System Integration

### Shared Design Tokens

```typescript
// packages/design-tokens/src/colors.ts
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    500: '#6b7280',
    700: '#374151',
    900: '#111827',
  },
  // ... more colors
};

// packages/design-tokens/src/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// packages/design-tokens/src/typography.ts
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
```

### Using Design Tokens

**Web (Tailwind):**
```typescript
// Tailwind classes map to design tokens
<button className="bg-primary-600 text-white px-md py-sm text-base font-semibold">
  Click me
</button>
```

**React Native:**
```typescript
import { colors, spacing, typography } from '@mintenance/design-tokens';

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
```

## Common Component Patterns

### Pattern 1: Input/TextField

```typescript
// Web (.web.tsx)
export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  error,
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500',
          error && 'border-red-500'
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// Native (.native.tsx)
export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  error,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[
          styles.input,
          error && styles.inputError,
        ]}
        {...props}
      />
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
};
```

### Pattern 2: Card Component

```typescript
// Web (.web.tsx)
export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  className,
}) => {
  const Component = onPress ? 'button' : 'div';

  return (
    <Component
      onClick={onPress}
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
        onPress && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
    >
      {children}
    </Component>
  );
};

// Native (.native.tsx)
export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
}) => {
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.card, style]}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
};
```

### Pattern 3: Modal/Dialog

```typescript
// Web (.web.tsx)
import * as Dialog from '@radix-ui/react-dialog';

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">
            {title}
          </Dialog.Title>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// Native (.native.tsx)
import { Modal as RNModal } from 'react-native';

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  return (
    <RNModal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </RNModal>
  );
};
```

### Pattern 4: List Item with Avatar

```typescript
// Web (.web.tsx)
export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  avatar,
  onPress,
}) => {
  return (
    <button
      onClick={onPress}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors"
    >
      {avatar && (
        <img
          src={avatar}
          alt={title}
          className="h-12 w-12 rounded-full object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{title}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
    </button>
  );
};

// Native (.native.tsx)
import { Image } from 'react-native';

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  avatar,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      {avatar && (
        <Image
          source={{ uri: avatar }}
          style={styles.avatar}
        />
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
```

## Platform-Specific Features

### Handling Platform Differences

```typescript
// types.ts
import { Platform } from 'react-native'; // Works on web too via react-native-web

export interface ComponentProps {
  // Shared props
  title: string;

  // Platform-specific (both optional)
  className?: string; // Web only
  style?: ViewStyle; // React Native only

  // Conditional prop based on platform
  ...(Platform.OS === 'web' ? {
    href?: string; // Web links
  } : {
    onLongPress?: () => void; // Native gesture
  })
}
```

### Platform Detection

```typescript
import { Platform } from 'react-native';

// Simple check
if (Platform.OS === 'web') {
  // Web-specific code
}

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  // Mobile-specific code
}

// Platform-specific values
const paddingTop = Platform.select({
  ios: 20,
  android: 10,
  web: 0,
});
```

### Conditional Imports

```typescript
// Use dynamic imports for platform-specific modules
let MapComponent;

if (Platform.OS === 'web') {
  MapComponent = require('./Map.web').Map;
} else {
  MapComponent = require('./Map.native').Map;
}
```

## Shared Logic Hooks

### Extract Business Logic to Hooks

```typescript
// packages/shared-ui/src/hooks/useFormValidation.ts
import { useState, useCallback } from 'react';
import { z } from 'zod';

export function useFormValidation<T extends z.ZodType>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(
    (data: unknown) => {
      try {
        schema.parse(data);
        setErrors({});
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            fieldErrors[path] = err.message;
          });
          setErrors(fieldErrors);
        }
        return false;
      }
    },
    [schema]
  );

  return { errors, validate };
}
```

**Usage (same on web and mobile):**

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function LoginForm() {
  const { errors, validate } = useFormValidation(schema);

  const handleSubmit = () => {
    if (validate(formData)) {
      // Submit
    }
  };

  return (
    <TextField
      label="Email"
      error={errors.email}
      // ...
    />
  );
}
```

## Testing Cross-Platform Components

### Web Tests (Vitest + React Testing Library)

```typescript
// Button.web.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button.web';

describe('Button (Web)', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onPress when clicked', () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Mobile Tests (Jest + React Native Testing Library)

```typescript
// Button.native.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, jest } from '@jest/globals';
import { Button } from './Button.native';

describe('Button (Native)', () => {
  it('renders children', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Click me</Button>);

    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId } = render(
      <Button loading testID="button">Click me</Button>
    );
    expect(getByTestId('button')).toBeTruthy();
  });
});
```

## Common Pitfalls

### ❌ Using Web-Only APIs in Shared Code

```typescript
// WRONG - localStorage doesn't exist in React Native
export function useLocalStorage(key: string) {
  return localStorage.getItem(key);
}

// CORRECT - Platform-specific implementations
// useStorage.web.ts
export function useStorage(key: string) {
  return localStorage.getItem(key);
}

// useStorage.native.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
export async function useStorage(key: string) {
  return await AsyncStorage.getItem(key);
}
```

### ❌ Hardcoding Pixel Values

```typescript
// WRONG - Fixed pixels don't scale
const styles = {
  fontSize: '16px', // Web
  fontSize: 16, // Native - but doesn't scale on different devices!
}

// CORRECT - Use relative units or scaled values
// Web: rem/em units
className="text-base" // Tailwind uses rem

// Native: Use Dimensions or scaled fonts
import { Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
const fontSize = width > 375 ? 18 : 16;
```

### ❌ Forgetting Accessibility

```typescript
// WRONG - No accessibility props
<TouchableOpacity onPress={onPress}>
  <Text>Submit</Text>
</TouchableOpacity>

// CORRECT - Include accessibility
<TouchableOpacity
  onPress={onPress}
  accessibilityLabel="Submit form"
  accessibilityRole="button"
  accessibilityHint="Submits the registration form"
>
  <Text>Submit</Text>
</TouchableOpacity>
```

## Best Practices

### ✅ Always Provide TypeScript Types

```typescript
// Export all types
export type { ButtonProps, ButtonVariant, ButtonSize } from './types';
```

### ✅ Use Semantic HTML on Web

```typescript
// Use <button>, <input>, <a> instead of generic <div>
<button type="button" onClick={onPress}>
  {children}
</button>
```

### ✅ Support Dark Mode

```typescript
// Web: Use Tailwind dark: variants
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"

// Native: Use useColorScheme
import { useColorScheme } from 'react-native';

const colorScheme = useColorScheme();
const isDark = colorScheme === 'dark';

const backgroundColor = isDark ? '#1f2937' : '#ffffff';
```

### ✅ Memoize Expensive Components

```typescript
import { memo } from 'react';

export const ExpensiveComponent = memo<ExpensiveProps>(({ data }) => {
  // Complex rendering logic
  return <div>{/* ... */}</div>;
});
```

## When to Use This Skill

Load this skill for:
- Creating new cross-platform components
- Adapting existing web components for mobile
- Adapting existing mobile components for web
- Understanding platform-specific APIs
- Implementing design system components
- Ensuring accessibility across platforms
- Performance optimization
- Testing component behavior on both platforms
