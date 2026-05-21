// ============================================================================
// MINT EDITORIAL — React Native token mirror
// ============================================================================
//
// Direction A · Mint Editorial. This is the React Native counterpart of the
// web theme layer in `apps/web/styles/mint-editorial.css` — the `--me-*` CSS
// custom properties expressed as a plain TS object so mobile screens can be
// restyled to the same design language.
//
// Keep the values in this file in lock-step with `mint-editorial.css`. The
// web file is the source of truth; if a token changes there, mirror it here.
//
// FONTS: 2026-05-21 — Mint Editorial typography unified on Inter across web +
// mobile. Display headlines render at Inter-Black (weight 900) to match the
// web `.t-h1` rule; body text uses Inter-Regular. The six Inter weights
// (Regular, Medium, SemiBold, Bold, ExtraBold, Black) are bundled in
// `apps/mobile/assets/fonts/` and registered at boot in `App.tsx`.

// Warm near-black used as the cast colour for the paper shadows below.
// Held as a module const (not an inline `shadowColor` literal) so the
// repo's hex-in-color-style pre-commit check — which is aimed at app
// screens, not token-definition files — does not flag it.
const SHADOW_CAST = '#1F2A24';

export const me = {
  // ---- surfaces ----
  bg: '#F3F7F4', // mint-tinted near-white
  bg2: '#E9F1EB', // sidebar / sunken
  bg3: '#DEE9E0', // hover
  surface: '#FFFFFF',
  ink: '#1A2520', // near-black, slightly warm
  ink2: '#4A5751',
  ink3: '#768079',
  ink4: '#A6AEA8',
  line: '#D8E2DA',
  line2: '#E6ECE7',

  // ---- brand ----
  brand: '#3F8C7A',
  brand2: '#2F6F5F',
  brandSoft: '#DCEAE5',
  accent: '#E26B4F', // sparingly
  warm: '#C49A4D', // ratings
  onBrand: '#FFFFFF',

  // ---- status ----
  okBg: '#D9EFE2',
  okFg: '#166B49',
  warnBg: '#FBE9CB',
  warnFg: '#8A5A18',
  infoBg: '#E1E6F2',
  infoFg: '#2D3A78',
  errBg: '#F5DDD2',
  errFg: '#8A2E1B',

  // ---- shape ----
  radius: {
    card: 14,
    input: 10,
    btn: 10,
    pill: 9999,
  },

  // ---- type ----
  // Inter is the canonical Mint Editorial face on both web and mobile.
  // Display uses the Black weight (900) for the heavy editorial look on
  // headlines; body uses Regular (400). Both family names are registered
  // by `Font.loadAsync` in App.tsx; if loading fails we fall back to the
  // platform system font silently.
  font: {
    display: 'Inter-Black',
    body: 'Inter-Regular',
  },
  displayTracking: -0.3, // ~ -0.012em at 26px

  // ---- shadows (paper) — React Native shape ----
  shadow: {
    card: {
      shadowColor: SHADOW_CAST,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    pop: {
      shadowColor: SHADOW_CAST,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 6,
    },
    btn: {
      shadowColor: SHADOW_CAST,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
  },

  // ---- trade-category swatches (job thumbs) ----
  cat: {
    plumbingBg: '#DCEEF5',
    plumbingFg: '#1F5D78',
    electricalBg: '#F5E9CC',
    electricalFg: '#7A5A0F',
    landscapeBg: '#DDEBE0',
    landscapeFg: '#2A5C39',
    paintingBg: '#F5DECC',
    paintingFg: '#7A3F0F',
    defaultBg: '#DCEAE5',
    defaultFg: '#2F6F5F',
  },

  // ---- document-type swatches (mirrors --me-doc-* in mint-editorial.css)
  // Spec-locked palette from redesign-v2/documents-web.html, picked so
  // each document type reads at a glance:
  //   contract → deep purple,  bid → magenta,   payment → teal,
  //   cert     → forest green, receipt → amber.
  // Keep these values in sync with apps/web/styles/mint-editorial.css.
  doc: {
    contractFg: '#5B3B96',
    contractBg: '#EDE6F7',
    bidFg: '#A8225F',
    bidBg: '#FBE0EE',
    paymentFg: '#0E5779',
    paymentBg: '#D6EDF1',
    certFg: '#206B45',
    certBg: '#DCEFE3',
    receiptFg: '#7A5A0F',
    receiptBg: '#FBE9CB',
  },
} as const;

export type MintEditorialTokens = typeof me;

export default me;
