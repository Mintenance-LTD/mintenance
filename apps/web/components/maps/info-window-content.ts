/** Build map popup nodes without interpreting user-controlled content as HTML. */
export function createMapElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.style.cssText = style;
  if (text !== undefined) element.textContent = text;
  return element;
}
