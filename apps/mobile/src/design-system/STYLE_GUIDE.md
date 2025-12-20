# Mintenance Mobile App - Style Guide

## Overview
This guide ensures consistency across the Mintenance mobile application. All developers should follow these conventions when building UI components and screens.

## Design System Location
- **Tokens**: `apps/mobile/src/design-system/tokens.ts`
- **Theme**: `apps/mobile/src/design-system/theme.tsx`
- **Components**: `apps/mobile/src/components/`

---

## 1. Typography

### Font Sizes
Always use typography tokens from `design-system/tokens.ts`:

```typescript
import { typography } from '@/design-system/tokens';

// ✅ CORRECT
const styles = StyleSheet.create({
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  body: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.normal * typography.fontSize.base,
  },
});

// ❌ WRONG - Hardcoded values
const styles = StyleSheet.create({
  title: {
    fontSize: 20,  // Don't hardcode!
    fontWeight: '700',  // Use tokens!
  },
});
```

### Font Size Scale
| Token | Size | Usage |
|-------|------|-------|
| `typography.fontSize.xs` | 12px | Captions, labels |
| `typography.fontSize.sm` | 14px | Secondary text |
| `typography.fontSize.base` | 16px | Body text (default) |
| `typography.fontSize.lg` | 18px | Subheadings |
| `typography.fontSize.xl` | 20px | Section titles |
| `typography.fontSize['2xl']` | 24px | Page titles |
| `typography.fontSize['3xl']` | 30px | Hero text |
| `typography.fontSize['4xl']` | 36px | Display titles |

### Font Weights
| Token | Value | Usage |
|-------|-------|-------|
| `typography.fontWeight.normal` | 400 | Body text |
| `typography.fontWeight.medium` | 500 | Emphasis |
| `typography.fontWeight.semibold` | 600 | Subheadings |
| `typography.fontWeight.bold` | 700 | Headings |
| `typography.fontWeight.extrabold` | 800 | Display |

---

## 2. Spacing

### Spacing Scale
Always use spacing tokens for margins and padding:

```typescript
import { spacing } from '@/design-system/tokens';

// ✅ CORRECT
const styles = StyleSheet.create({
  container: {
    padding: spacing[4],  // 16px
    marginBottom: spacing[6],  // 24px
  },
  section: {
    paddingHorizontal: spacing.lg,  // 24px (semantic)
    paddingVertical: spacing.md,  // 16px (semantic)
  },
});

// ❌ WRONG
const styles = StyleSheet.create({
  container: {
    padding: 15,  // Don't use arbitrary values!
    marginBottom: 23,  // Not from scale!
  },
});
```

### Spacing Reference
| Token | Value | Semantic | Usage |
|-------|-------|----------|-------|
| `spacing[1]` | 4px | `spacing.xs` | Tight spacing |
| `spacing[2]` | 8px | `spacing.sm` | Small gaps |
| `spacing[4]` | 16px | `spacing.md` | Default spacing |
| `spacing[6]` | 24px | `spacing.lg` | Section spacing |
| `spacing[8]` | 32px | `spacing.xl` | Large gaps |
| `spacing[12]` | 48px | `spacing['2xl']` | Major sections |

---

## 3. Colors

### Using Theme Colors
Always use theme colors for light/dark mode support:

```typescript
import { useTheme } from '@/design-system/theme';

// ✅ CORRECT
export const MyScreen = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.primary,
    },
    text: {
      color: theme.colors.text.primary,
    },
    button: {
      backgroundColor: theme.colors.primary[500],
    },
  });
};

// ❌ WRONG - Hardcoded colors
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',  // Won't adapt to dark mode!
  },
  text: {
    color: '#000000',  // No theme support!
  },
});
```

### Color Categories
| Category | Usage | Example |
|----------|-------|---------|
| `theme.colors.primary[500]` | Primary brand actions | Buttons, links |
| `theme.colors.secondary[500]` | Secondary actions | Alt buttons |
| `theme.colors.text.primary` | Main text | Body copy |
| `theme.colors.text.secondary` | Supporting text | Descriptions |
| `theme.colors.background.primary` | Main background | Screen bg |
| `theme.colors.surface.primary` | Cards, panels | Elevated content |
| `theme.colors.border.primary` | Borders | Dividers, outlines |
| `theme.colors.success[600]` | Success states | Confirmations |
| `theme.colors.error[600]` | Error states | Alerts, validation |
| `theme.colors.warning[600]` | Warning states | Cautions |

---

## 4. Border Radius

```typescript
import { borderRadius } from '@/design-system/tokens';

// ✅ CORRECT
const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,  // 12px
  },
  button: {
    borderRadius: borderRadius.md,  // 8px
  },
  avatar: {
    borderRadius: borderRadius.full,  // 9999px (circle)
  },
});
```

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| `borderRadius.none` | 0px | Sharp corners |
| `borderRadius.sm` | 4px | Subtle rounding |
| `borderRadius.base` | 6px | Default |
| `borderRadius.md` | 8px | Buttons |
| `borderRadius.lg` | 12px | Cards |
| `borderRadius.xl` | 16px | Modals |
| `borderRadius['2xl']` | 20px | Large cards |
| `borderRadius.full` | 9999px | Circles, pills |

---

## 5. Shadows & Elevation

```typescript
import { shadows } from '@/design-system/tokens';
import { useTheme } from '@/design-system/theme';

// ✅ CORRECT
export const MyComponent = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    card: {
      ...theme.elevation.md,  // From theme (adapts to light/dark)
    },
    modal: {
      ...theme.elevation.xl,
    },
  });
};

// Alternative: Direct token usage
const styles = StyleSheet.create({
  card: {
    ...shadows.md,
  },
});
```

### Elevation Levels
| Level | Usage |
|-------|-------|
| `theme.elevation.sm` | Subtle elevation (buttons) |
| `theme.elevation.md` | Cards, list items |
| `theme.elevation.lg` | Floating buttons, dropdowns |
| `theme.elevation.xl` | Modals, dialogs |

---

## 6. Component Sizes

Use standardized component sizes:

```typescript
import { componentSizes } from '@/design-system/tokens';

// ✅ CORRECT - Button sizes
const styles = StyleSheet.create({
  smallButton: {
    height: componentSizes.button.sm.height,  // 32px
    paddingHorizontal: componentSizes.button.sm.paddingHorizontal,
    fontSize: componentSizes.button.sm.fontSize,
  },
  defaultButton: {
    height: componentSizes.button.md.height,  // 40px
    paddingHorizontal: componentSizes.button.md.paddingHorizontal,
    fontSize: componentSizes.button.md.fontSize,
  },
});
```

---

## 7. Reusable Components

### Always Use Design System Components

```typescript
// ✅ CORRECT - Use standardized components
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

<Input
  label="Email"
  variant="outline"
  size="lg"
  fullWidth
/>

<Button
  variant="primary"
  size="lg"
  onPress={handleSubmit}
>
  Submit
</Button>

// ❌ WRONG - Custom TextInput with inline styles
<TextInput
  style={{
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
  }}
/>
```

### Available Components
- `<Input />` - Text inputs with variants
- `<Button />` - Buttons with variants
- `<Card />` - Elevated containers
- `<Badge />` - Status indicators
- `<Avatar />` - User avatars
- `<Spinner />` - Loading indicators

---

## 8. Screen Structure Template

```typescript
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system/theme';
import { spacing, typography } from '@/design-system/tokens';

export const MyScreen = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Screen content */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing[6],  // 24px
  },
});
```

---

## 9. Accessibility Guidelines

### Minimum Touch Targets
```typescript
import { accessibility } from '@/design-system/tokens';

const styles = StyleSheet.create({
  button: {
    minWidth: accessibility.minTouchTarget.width,  // 44px
    minHeight: accessibility.minTouchTarget.height,  // 44px
  },
});
```

### Accessibility Props
Always include:
```typescript
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Submit form"
  accessibilityHint="Double tap to submit the form"
  accessibilityState={{ disabled: isLoading }}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

---

## 10. Common Patterns

### Loading States
```typescript
if (isLoading) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
    </View>
  );
}
```

### Error States
```typescript
if (error) {
  return (
    <View style={styles.errorContainer}>
      <Text style={[
        styles.errorText,
        { color: theme.colors.error[600] }
      ]}>
        {error.message}
      </Text>
    </View>
  );
}
```

### Responsive Layouts
```typescript
import { screenWidth } from '@/design-system/tokens';

const isSmallScreen = screenWidth < 375;

const styles = StyleSheet.create({
  container: {
    padding: isSmallScreen ? spacing[4] : spacing[6],
  },
});
```

---

## 11. Migration Checklist

When updating an existing screen:

- [ ] Replace all hardcoded `fontSize` with `typography.fontSize.*`
- [ ] Replace all hardcoded spacing with `spacing[*]`
- [ ] Replace all hardcoded colors with `theme.colors.*`
- [ ] Replace all hardcoded `borderRadius` with `borderRadius.*`
- [ ] Use `theme.elevation.*` for shadows
- [ ] Replace custom inputs with `<Input />` component
- [ ] Replace custom buttons with `<Button />` component
- [ ] Add accessibility props
- [ ] Test in both light and dark mode
- [ ] Test with text scaling enabled

---

## 12. Common Mistakes to Avoid

### ❌ DON'T
```typescript
// Hardcoded values
fontSize: 16
padding: 24
color: '#000000'
borderRadius: 8

// Inconsistent spacing
margin: 15
padding: 23

// Direct color hex codes
backgroundColor: '#FFFFFF'

// Missing theme support
const styles = StyleSheet.create({...})  // Outside component
```

### ✅ DO
```typescript
// Use tokens
fontSize: typography.fontSize.base
padding: spacing[6]
color: theme.colors.text.primary
borderRadius: borderRadius.md

// Use scale
margin: spacing[4]
padding: spacing[6]

// Use theme
backgroundColor: theme.colors.background.primary

// Dynamic styles
const { theme } = useTheme();
const styles = StyleSheet.create({...})  // Inside component
```

---

## 13. Code Review Checklist

Before submitting a PR:

- [ ] No hardcoded font sizes
- [ ] No hardcoded colors
- [ ] No hardcoded spacing values
- [ ] Using theme for light/dark support
- [ ] Accessibility props added
- [ ] Follows component patterns
- [ ] Tested on both platforms (iOS/Android)
- [ ] Tested with text scaling
- [ ] Tested in dark mode

---

## Resources

- **Design Tokens**: `apps/mobile/src/design-system/tokens.ts`
- **Theme System**: `apps/mobile/src/design-system/theme.tsx`
- **Components**: `apps/mobile/src/components/`
- **Example Screen**: `apps/mobile/src/screens/RegisterScreen.tsx` (good example)

---

## Questions?

If you're unsure about which token to use:
1. Check existing screens for similar patterns
2. Refer to `RegisterScreen.tsx` as a reference implementation
3. Ask in #dev-mobile channel

---

*Last Updated: 2025-01-10*
*Version: 1.0.0*
