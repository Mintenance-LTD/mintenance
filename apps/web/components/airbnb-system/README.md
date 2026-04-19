# airbnb-system — landing-page component library

**Scope**: This folder contains components used ONLY on the marketing / landing page (`app/(public)/landing/`). It's NOT a general design system — do not import from here in contractor / homeowner / admin routes.

## When to use what

| Need | Use |
|------|-----|
| Generic `Button`, `Badge`, `Input` | `@mintenance/shared-ui` (not this folder) |
| Landing-page `SearchBar` hero, `ListingCard`, `ContractorCard` | This folder — they encode landing-specific layout / Airbnb-inspired aesthetics |
| `RatingStars`, `PhotoGallery`, `Carousel`, `Modal` | This folder for landing; use shared-ui variants elsewhere once they exist |

## Deprecated components (Sprint 7 / 5.1)

These files duplicate `@mintenance/shared-ui` primitives and should be migrated away:

- `Button.tsx` → use `@mintenance/shared-ui`'s `Button` (web export) instead.
- `Badge.tsx` → use `@mintenance/shared-ui`'s `Badge` / `StatusBadge`.
- `Input.tsx` → use `@mintenance/shared-ui`'s `Input`.

The files remain in place to avoid breaking the 2 existing call sites
(`app/(public)/landing/page.tsx` + `components/AppPreviewSection.tsx`).
A dedicated migration PR should:

1. Replace those 2 imports with `@mintenance/shared-ui` equivalents.
2. Delete the three `.tsx` files above.
3. Remove the corresponding re-exports from `index.tsx`.

The landing-specific components (ListingCard, ContractorCard, SearchBar,
RatingStars, PhotoGallery, Carousel) stay here.

## Why the split exists

- Landing page needs bespoke visual direction (hero search, Airbnb-style cards) that doesn't belong in the cross-product design system.
- Contractor / homeowner / admin surfaces share tokens + primitives via `@mintenance/shared-ui` so the platform looks cohesive internally.
- The original audit flagged this as "dual design system debt" — the duplicated primitives are the real debt; the landing-specific components are intentional.
