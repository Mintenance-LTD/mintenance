# Onboarding layout verification

Run from `apps/web` with the repository dependencies installed:

```sh
npx vite --config e2e/onboarding-preview/vite.config.mjs
```

Open `http://127.0.0.1:4318/`. This fixture imports the production homeowner and contractor dashboards, shells, onboarding hooks, components, global CSS and CSS modules. Only Next navigation/image adapters, identity/realtime hooks and API responses are replaced with deterministic sample data. It is outside the Next app routes and cannot be accessed in a production deployment. It sends no requests to a live database.

Useful cases:

- `/?case=home&tour=true` — first-visit homeowner tour.
- `/?case=owner&role=contractor&tour=true` — contractor owner.
- `/?case=member&role=contractor&member=true&tour=true` — contractor team member.
- `/?case=offline&progress=unavailable&tour=true` — failed progress request, no unsolicited tour, manual tour still available.
- `/?case=no-grant&benefits=false` — no benefits notice.

Use a new `case` value for a fresh account-scoped local journey. Check desktop, 390×844 and 320×568 viewports. Confirm the header starts at the top, the dashboard heading remains visible, the guide card is not viewport-height, and the dialog/buttons stay within the viewport. Check Next, Back, Skip, Escape, focus return, body/root scroll locking and retry details. Check contractor navigation at phone width. Capture screenshots with the actual CSS loaded; DOM-only component tests cannot detect the original regression.

Screenshots and the recorded verification scope are in `docs/onboarding-visual-checks/`.
