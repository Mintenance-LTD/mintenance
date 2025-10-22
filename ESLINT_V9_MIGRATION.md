# ESLint v9 Migration Guide

This document outlines the migration path from ESLint 8 to ESLint 9 for the Mintenance monorepo.

## Current Status

- **ESLint Version**: 8.57.1 (deprecated)
- **Configuration Format**: Legacy `.eslintrc.js`
- **Workspaces Affected**: Root, Web App, Mobile App

## Why Migrate?

1. **EOL Support**: ESLint 8 is no longer supported
2. **Performance**: v9 offers better performance with flat config
3. **Simplified Configuration**: Flat config is easier to understand and maintain
4. **Future-Proof**: All new features will only be in v9+
5. **Security**: Continued security updates only for supported versions

## Major Changes in ESLint v9

### 1. Flat Config Format (Required)

ESLint 9 requires the new flat config format (`eslint.config.js`):

**Old (.eslintrc.js):**
```javascript
module.exports = {
  extends: ['next', 'prettier'],
  plugins: ['react'],
  parser: '@typescript-eslint/parser',
  parserOptions: { /* ... */ },
  env: { browser: true, node: true },
  rules: { /* ... */ }
};
```

**New (eslint.config.js):**
```javascript
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin
    },
    rules: { /* ... */ }
  },
  prettier
];
```

### 2. Package Changes

Several packages are deprecated or renamed:

| Old Package | New Package | Status |
|-------------|-------------|--------|
| `@humanwhocodes/config-array` | `@eslint/config-array` | Deprecated |
| `@humanwhocodes/object-schema` | `@eslint/object-schema` | Deprecated |
| `eslint-config-next` (v15+) | Built-in flat config support | Update needed |
| `eslint-config-expo` | May need updates | Check compatibility |

### 3. Plugin Import Changes

Plugins must be imported directly instead of referenced by string:

**Old:**
```javascript
{
  extends: ['plugin:@typescript-eslint/recommended'],
  plugins: ['react']
}
```

**New:**
```javascript
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';

export default [
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin
    }
  }
];
```

### 4. No More `extends`

Use array spreading instead:

**Old:**
```javascript
{
  extends: ['next', 'prettier']
}
```

**New:**
```javascript
import nextConfig from 'eslint-config-next';
import prettier from 'eslint-config-prettier';

export default [
  ...nextConfig,
  prettier
];
```

### 5. Language Options

`env`, `parser`, and `parserOptions` are replaced with `languageOptions`:

**Old:**
```javascript
{
  env: {
    browser: true,
    node: true,
    jest: true,
    es6: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
}
```

**New:**
```javascript
import globals from 'globals';

{
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    },
    globals: {
      ...globals.browser,
      ...globals.node,
      ...globals.jest,
      ...globals.es2021
    }
  }
}
```

### 6. Ignore Patterns

`ignorePatterns` becomes a separate config object:

**Old:**
```javascript
{
  ignorePatterns: ['node_modules/', 'dist/', 'build/']
}
```

**New:**
```javascript
export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**']
  },
  // ... other configs
];
```

## Migration Strategy

We recommend a **phased migration** approach:

### Phase 1: Preparation (Week 1)
- [ ] Audit all ESLint plugins and configs for v9 compatibility
- [ ] Update documentation
- [ ] Create compatibility testing branch
- [ ] Review breaking changes in dependencies

### Phase 2: Update Dependencies (Week 2)
- [ ] Update ESLint to v9
  ```bash
  npm install --save-dev eslint@^9
  ```
- [ ] Update TypeScript ESLint packages
  ```bash
  npm install --save-dev @typescript-eslint/parser@^8 @typescript-eslint/eslint-plugin@^8
  ```
- [ ] Install required new packages
  ```bash
  npm install --save-dev globals @eslint/js
  ```
- [ ] Update Next.js and Expo configs (if needed)

### Phase 3: Convert Root Config (Week 2)
- [ ] Create new `eslint.config.js` in root
- [ ] Convert rules and settings
- [ ] Test linting across all workspaces
- [ ] Fix any configuration issues
- [ ] Remove old `.eslintrc.js`

### Phase 4: Convert Web App Config (Week 3)
- [ ] Create `eslint.config.js` in `apps/web/`
- [ ] Convert Next.js specific rules
- [ ] Test with `npm run lint:web`
- [ ] Verify editor integration works
- [ ] Remove old `.eslintrc.js`

### Phase 5: Convert Mobile App Config (Week 3)
- [ ] Create `eslint.config.js` in `apps/mobile/`
- [ ] Convert Expo specific rules
- [ ] Test with `npm run lint:mobile`
- [ ] Verify React Native specific rules work
- [ ] Remove old `.eslintrc.js`

### Phase 6: Update CI/CD (Week 4)
- [ ] Update GitHub Actions workflows
- [ ] Update pre-commit hooks (if any)
- [ ] Update editor config recommendations
- [ ] Verify all lint jobs pass

### Phase 7: Documentation & Training (Week 4)
- [ ] Update CONTRIBUTING.md
- [ ] Update README with new lint commands
- [ ] Create team training materials
- [ ] Announce migration completion

## Compatibility Matrix

### Next.js

| Next.js Version | ESLint 9 Support |
|-----------------|------------------|
| 15.0.0+ | ✅ Full support with flat config |
| 14.x | ⚠️ Limited (use compat) |
| 13.x | ❌ Use migration tools |

**Current**: We're on Next.js 15.0.0, so we have full support.

### Expo

| Expo SDK | ESLint 9 Support |
|----------|------------------|
| 52+ | ✅ Full support |
| 51 | ⚠️ May need updates |
| 50 | ❌ Not recommended |

**Action**: Check current Expo SDK version in `apps/mobile/app.json`

### TypeScript ESLint

| Version | ESLint 9 Support |
|---------|------------------|
| v8+ | ✅ Full support |
| v7 | ⚠️ Partial |
| v6 | ❌ Not compatible |

## Common Issues & Solutions

### Issue 1: Plugin Not Found

**Error**: `Cannot find module 'eslint-plugin-react'`

**Solution**: Import plugins directly:
```javascript
import reactPlugin from 'eslint-plugin-react';
```

### Issue 2: Config Not Extending

**Error**: `Invalid config extends`

**Solution**: Use array spreading:
```javascript
import nextConfig from 'eslint-config-next/flat';
export default [...nextConfig, /* your config */];
```

### Issue 3: Globals Not Defined

**Error**: `'process' is not defined`

**Solution**: Import and use globals:
```javascript
import globals from 'globals';

export default [{
  languageOptions: {
    globals: {
      ...globals.node
    }
  }
}];
```

### Issue 4: Overrides Not Working

**Solution**: Use separate config objects with `files` patterns:
```javascript
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: { /* TypeScript rules */ }
  },
  {
    files: ['**/*.test.ts'],
    rules: { /* Test-specific rules */ }
  }
];
```

## Example Migration: Root Config

**Before (.eslintrc.js):**
```javascript
module.exports = {
  extends: [
    'next',
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'react'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
};
```

**After (eslint.config.js):**
```javascript
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.d.ts'
    ]
  },

  // Base configuration
  js.configs.recommended,

  // TypeScript and React configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json'
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ...globals.es2021
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      '@next/next': nextPlugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'no-duplicate-imports': 'error',

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error'
    }
  },

  // Prettier (must be last)
  prettier
];
```

## Testing Checklist

After migration, test:

- [ ] `npm run lint` - Root lint passes
- [ ] `npm run lint:web` - Web app lint passes
- [ ] `npm run lint:mobile` - Mobile app lint passes
- [ ] VSCode ESLint extension works
- [ ] Auto-fix on save works
- [ ] Pre-commit hooks work (if configured)
- [ ] CI/CD lint jobs pass
- [ ] No false positives on existing code
- [ ] Custom rules still work

## Rollback Plan

If migration causes issues:

1. Revert to previous commit
   ```bash
   git revert <migration-commit>
   ```

2. Downgrade ESLint
   ```bash
   npm install --save-dev eslint@^8.57.1
   ```

3. Restore `.eslintrc.js` files from git history

4. Document issues for next attempt

## Resources

- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [Flat Config Documentation](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [TypeScript ESLint v8 Docs](https://typescript-eslint.io/getting-started)
- [Next.js 15 ESLint](https://nextjs.org/docs/app/building-your-application/configuring/eslint)
- [Expo ESLint Config](https://docs.expo.dev/guides/using-eslint/)

## Timeline

**Estimated Duration**: 4 weeks (part-time)

- **Week 1**: Research & preparation
- **Week 2**: Dependency updates & root config
- **Week 3**: App-specific configs
- **Week 4**: CI/CD updates & documentation

**Recommended Start**: After current sprint completion

## Next Steps

1. **Immediate**: Review this guide with the team
2. **This Week**: Create compatibility testing branch
3. **Next Week**: Begin Phase 1 (Preparation)
4. **Monitor**: Watch for updates from Next.js and Expo teams

## Questions?

For questions about the migration, contact the infrastructure team or create an issue with the `eslint-migration` label.
