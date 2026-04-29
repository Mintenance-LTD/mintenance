/**
 * Safe clipboard copy with graceful fallback.
 *
 * Why this exists:
 *   `navigator.clipboard.writeText` is the modern way, but it rejects with
 *   `NotAllowedError` in several legitimate situations: insecure origins,
 *   iframes without `clipboard-write` permission, browsers running in
 *   strict mode, and user-gesture-less contexts. The 2026-04-27 audit
 *   surfaced production console errors of the form:
 *
 *     NotAllowedError: Failed to execute 'writeText' on 'Clipboard':
 *     Write permission denied.
 *
 *   …because most call sites in the web app called writeText without
 *   catching the rejection or retrying with `document.execCommand('copy')`.
 *
 *   The execCommand path is technically deprecated but every browser still
 *   ships it, and it works in the situations where the modern API refuses.
 *   So: try the modern API first, fall back, return a boolean so the
 *   caller can choose between a success toast and a manual-copy hint.
 */
export async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Modern API path. Wrap in try/catch because the rejection is the whole
  // reason this util exists.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand. Don't log here — every site that
      // cares wraps the call in its own user-facing toast/error path.
    }
  }

  // execCommand fallback. Hidden textarea is the standard cross-browser
  // recipe; the offscreen position keeps it from flashing on the page.
  if (typeof document !== 'undefined') {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '1px';
    textArea.style.height = '1px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);

    try {
      textArea.select();
      textArea.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      return ok;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }

  return false;
}
