/**
 * Minimal sanitization utilities for user-provided text.
 * Removes HTML tags, event handlers, and dangerous protocols.
 */

const DANGEROUS_PROTOCOLS = /\b(?:javascript|vbscript|data):/gi;
const EVENT_HANDLER_ATTRS = /\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const SCRIPT_TAGS = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const ALL_TAGS = /<[^>]*>/g;

export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  let out = String(input);
  // Remove script tags entirely
  out = out.replace(SCRIPT_TAGS, '');
  // Remove event handler attributes like onerror=, onclick=
  out = out.replace(EVENT_HANDLER_ATTRS, '');
  // Strip dangerous protocols
  out = out.replace(DANGEROUS_PROTOCOLS, '');
  // Strip remaining HTML tags
  out = out.replace(ALL_TAGS, '');
  return out;
}

// Back-compat default export
export default { sanitizeText };
