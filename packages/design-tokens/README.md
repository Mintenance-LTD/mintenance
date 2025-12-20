# @mintenance/design-tokens

Shared design tokens package for Mintenance web and mobile applications.

## Overview

This package provides a single source of truth for all design tokens (colors, typography, spacing, shadows, border radius) used across both the web (Next.js) and mobile (React Native/Expo) applications. This ensures visual consistency while allowing platform-specific adaptations.

## Installation

This package is part of the Mintenance monorepo and is automatically linked via workspace dependencies.

```json
{
  "dependencies": {
    "@mintenance/design-tokens": "file:../../packages/design-tokens"
  }
}
```

## Usage

### Web (Next.js)

```typescript
import { webTokens } from '@mintenance/design-tokens';

// Use tokens directly
const primaryColor = webTokens.colors.primary;
const fontSize = webTokens.typography.fontSize.base; // "15px"
const spacing = webTokens.spacing.md; // "16px"
const shadow = webTokens.shadows.lg;

// Or use in theme
import { webTokens } from '@mintenance/design-tokens';
const theme = {
  colors: webTokens.colors,
  typography: webTokens.typography,
  // ...
};
```

### Mobile (React Native)

```typescript
import { mobileTokens, createNormalize } from '@mintenance/design-tokens';
import { PixelRatio, Dimensions } from 'react-native';

// Create normalize function for font scaling
const normalize = createNormalize(
  Dimensions.get('window').width,
  () => PixelRatio.getFontScale(),
  (size: number) => PixelRatio.roundToNearestPixel(size)
);

// Use tokens
const primaryColor = mobileTokens.colors.primary;
const fontSize = normalize(mobileTokens.typography.rawFontSize.base);
const spacing = mobileTokens.spacing.md; // 16 (number)
const shadow = mobileTokens.shadows.base; // React Native shadow object
```

## Token Categories

### Colors

All color values extracted from the web app theme to ensure consistency:

- **Primary**: `#0F172A` (dark blue)
- **Secondary**: `#10B981` (emerald green)
- **Status colors**: success, error, warning, info
- **Neutral grays**: gray25 through gray900
- **Text colors**: textPrimary, textSecondary, textTertiary
- **Category colors**: plumbing, electrical, hvac, etc.

### Typography

- **Font sizes**: xs (11px) through 5xl (48px)
- **Font weights**: 400, 500, 600, 700
- **Line heights**: tight (1.2), normal (1.5), relaxed (1.6), loose (1.8)
- **Letter spacing**: tighter through widest

### Spacing

4px base unit scale:
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px

### Shadows

- **Web**: CSS box-shadow strings
- **Mobile**: React Native shadow objects with elevation

### Border Radius

- `sm`: 4px
- `base`: 8px
- `lg`: 12px
- `xl`: 16px
- `2xl`: 24px
- `full`: 9999px

## Platform Adapters

### Web Adapter (`webTokens`)

Converts tokens to CSS/Tailwind-compatible format:
- Font sizes as `"15px"` strings
- Spacing as `"16px"` strings
- Shadows as CSS box-shadow strings
- Includes gradients and effects (web-specific)

### Mobile Adapter (`mobileTokens`)

Converts tokens to React Native-compatible format:
- Font sizes as raw numbers (for normalization)
- Spacing as numbers
- Shadows as React Native shadow objects
- Includes `createNormalize` factory for font scaling

## Development

### Building

```bash
npm run build -w @mintenance/design-tokens
```

### Watching for Changes

```bash
npm run dev -w @mintenance/design-tokens
```

## Design Philosophy

- **Single Source of Truth**: All design values defined once
- **Platform Agnostic**: Core tokens are platform-independent
- **Platform Adaptations**: Adapters handle platform-specific formats
- **Visual Consistency**: Web app values are the source of truth
- **Backward Compatible**: Existing themes maintain same API

## Migration Notes

This package was created as part of Phase 1 of the Mobile-Web Consistency Improvement Plan. The tokens were extracted from the existing web app theme (`apps/web/lib/theme.ts`) to ensure zero visual changes during migration.

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { Colors, Typography, Spacing, Shadows, BorderRadius } from '@mintenance/design-tokens';
```

## License

MIT

