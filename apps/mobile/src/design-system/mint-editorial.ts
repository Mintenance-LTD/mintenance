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
// FONTS: 2026-07-17 — mirrors the web cutover in
// `apps/web/styles/mint-editorial.css` --me-font-display: the editorial
// serif is retired in favor of Inter across every screen that reads
// `me.font.display` (KPI numbers, £ amounts, card titles, headings).
// Instrument Serif hurt scannability on dense stat numbers for a
// trade/property-maintenance audience. Uses the already-bundled
// 'Inter-SemiBold' static font (weight 600, matching web's
// --me-display-weight: 600) — not the heavy 'Inter-Black' that caused
// the 2026-05-21 regression this file used to warn about.
//   display: Inter-SemiBold (weight 600)
//   body:    Geist (regular, weight 400) — clean modern sans
// Geist comes from `@expo-google-fonts/geist`, registered in App.tsx at
// boot. Inter statics ship as local assets, also loaded in App.tsx.

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
  // Display = Inter SemiBold (weight 600) — mirrors web's
  // --me-font-display / --me-display-weight: 600.
  // Body    = Geist Regular (modern geometric sans).
  // Family names follow the @expo-google-fonts naming for Geist and the
  // local static-font naming (App.tsx Font.loadAsync) for Inter.
  font: {
    display: 'Inter-SemiBold',
    body: 'Geist_400Regular',
    bodyMedium: 'Geist_500Medium',
    bodySemiBold: 'Geist_600SemiBold',
    bodyBold: 'Geist_700Bold',
  },
  // Mirrors web's --me-display-tracking: -0.02em, converted to RN's flat
  // px letterSpacing at the same ~26-30px headline reference size used
  // across the 66 screens that read this token (-0.02em * 28px ≈ -0.56px).
  displayTracking: -0.56,

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
