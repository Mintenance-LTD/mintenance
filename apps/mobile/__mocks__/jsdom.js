/**
 * Metro stand-in for the Node-only `jsdom` package.
 *
 * metro.config.js resolveRequest maps `jsdom` here: @mintenance/security
 * statically imports WebSanitizer (which requires jsdom), but on React
 * Native only MobileSanitizer runs, so nothing ever calls into this at
 * runtime. This file was referenced by metro.config.js but never committed
 * — every CI `expo export` died with "Failed to get the SHA-1 for:
 * __mocks__/jsdom.js" (2026-07-27).
 *
 * The JSDOM constructor throws so any accidental runtime use fails loudly
 * instead of silently sanitizing nothing.
 */
class JSDOM {
  constructor() {
    throw new Error(
      'jsdom is not available in React Native — use MobileSanitizer instead of WebSanitizer'
    );
  }
}

module.exports = { JSDOM };
