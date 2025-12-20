# Design System Alignment & Accessibility Plan

## Why This Exists
Contractor surfaces on web/mobile now share screenshots with inconsistent gradients, button weights, and empty-state behavior. Tokens live in multiple places (`packages/design-tokens`, `apps/web/lib/theme.ts`, `apps/mobile/src/design-system/tokens.ts`, `apps/web/tailwind.config.js`), empty states are one-off (`apps/web/components/ui/EmptyState.tsx` plus ad-hoc implementations in Jobs, Messages, Payments), and accessibility is unverified. This plan outlines how to align foundations before additional feature work.

---

## 1. Token Alignment & Component Variants

### Current Observations
- `apps/web/lib/theme.ts` extends `@mintenance/design-tokens` but also defines bespoke `teal`/`navy` palettes that diverge from Tailwind’s mapping in `apps/web/tailwind.config.js`, so components read different hex codes depending on import path.
- Mobile (`apps/mobile/src/design-system/tokens.ts`) ships its own normalization logic (PixelRatio scaling, hard-coded colors) rather than consuming the shared `packages/design-tokens` adapter, so typography and elevation drift between platforms.
- Component-level variants (button, card, input) only exist as inline objects inside `theme.components` with no canonical documentation or Storybook usage, which makes it hard to reason about states like hover, pressed, disabled.

### Actions
1. **Single Source of Truth**
   - Extend `packages/design-tokens/src/adapters` with `unifiedTokens` that both `apps/web` and `apps/mobile` import. For mobile, drop bespoke scaling in favor of reading base values + supplying a helper (e.g., `getScaledFontSize`) so tokens remain numeric.
2. **Token Export Pipeline**
   - Generate `tokens.json` during build (e.g., `pnpm tokens:build`) and feed both Tailwind (`apps/web/tailwind.config.js`) and React Native via a generated TypeScript file. Document the process in `packages/design-tokens/README.md`.
3. **Component Variant Specs**
   - Author spec tables for buttons/cards/inputs in this doc or a new `docs/design-system/component-variants.md`, documenting tokens for base/hover/pressed/disabled/focus states and elevation levels. Hook `theme.components` + Storybook stories to those specs.
4. **Token Linting**
   - Add ESLint rule or codemod to forbid hard-coded color hex values in `apps/web` and `apps/mobile`. Provide a fixer that maps to tokens (e.g., `theme.colors.primary`).

Deliverables: aligned token package, updated Tailwind + React Native imports, documented component variants, linting guardrails.

---

## 2. Purposeful Empty States & Inline Education

### Current Observations
- Multiple bespoke empty states live under `apps/web/app/**/components`, each hand-specified with different iconography and messaging (see Jobs, Messages, Payment Methods, Discover). The shared `EmptyState` component is purely visual with one CTA, no educational copy or secondary links.
- There is no taxonomy for empty states (e.g., onboarding vs. zero-data vs. filtered results), so teams invent new messaging per surface; inline help (tips, docs, contact support) is not surfaced.

### Actions
1. **Empty-State System**
   - Define 3–4 semantic variants (`onboarding`, `zero-data`, `filtered`, `error`) with guidance on tone, CTA count, and educational snippets. Encode them as props on `EmptyState` (or via composable slots) and document usage per page type.
2. **Inline Education Framework**
   - Pair each empty state with contextual help: small list of “Next actions” (links to docs, contact support, or quick tips). Extend `EmptyStateProps` with `helpItems` (array of title + link/icon).
3. **Inventory & Cleanup**
   - Audit all current usages (use `rg "EmptyState"` output) and migrate them to the new variants. For modules with more complex flows (Reporting, Financials), include inline “Learn why” accordions explaining metrics.
4. **Design Assets**
   - Provide illustrative assets (SVG or Lottie) with accessible descriptions; house them in `public/empty-states` and reference tokens for consistent color usage.

Deliverables: updated component API, content guidelines, migrated pages, and optional design kit for product/marketing alignment.

---

## 3. Accessibility Review & Remediation

### Current Observations
- Focus outlines and high-contrast palettes vary per component. Some cards rely on text colors (`theme.colors.textSecondary`) that fall below WCAG AA on light backgrounds.
- Keyboard navigation/focus order is not defined in documentation. There’s no automated accessibility test suite (no axe or pa11y scripts) in CI.
- Icon-only buttons (e.g., Jobs header icons) lack `aria-label`s or visible focus indicators.

### Actions
1. **Audit Pass**
   - Run axe-core (via Cypress or Storybook addon) across key contractor pages (Dashboard, Jobs, Financials, Settings) to capture baseline issues. Complement with manual keyboard/Screen Reader checks.
2. **Contrast & Token Verification**
   - Update token documentation with contrast ratios, and adjust `textSecondary`, `border`, etc., where they fail AA. Reflect changes in both Tailwind and RN tokens.
3. **Focus & Semantics**
   - Standardize focus rings using tokens (e.g., `borderFocus`) and ensure components use semantic elements (`button`, `nav`, `main`, etc.). Expand `theme.components` to include focus styles and ensure `Button`, `IconButton`, `Card` honor them.
4. **Automated Checks**
   - Add lint/test scripts (`pnpm test:accessibility`) that run axe on Storybook stories or Playwright flows. Block merges on Level A/AA regressions.

Deliverables: accessibility report, updated tokens, component focus guidelines, CI check.

---

## Timeline & Owners
| Week | Focus | Key Owners |
| --- | --- | --- |
| Week 1 | Token alignment spike, pipeline setup | Design Systems, Web Infrastructure |
| Week 2 | Component variant docs, lint automation | Design Systems |
| Week 3 | Empty-state inventory + refactor | UX Writing, Web Core |
| Week 4 | Accessibility audit + fixes, automated checks | Accessibility lead, QA |

---

## Success Metrics
- 100% of web/mobile components import tokens from `@mintenance/design-tokens`.
- Empty states across dashboard modules follow new taxonomy and include educational links.
- Axe-core/Playwright accessibility suite passes with no critical/high issues; contrast ratios logged in token docs.
