export const usePathname = () =>
  new URLSearchParams(window.location.search).get('role') === 'contractor'
    ? '/contractor/dashboard-enhanced'
    : '/dashboard';
export const useRouter = () => ({
  push: (href: string) => {
    window.location.href = previewHref(href);
  },
  refresh: () => {},
});

// Preserve the sample account and failure scenario across fixture navigation.
export function previewHref(href: string) {
  const target = new URL(href, window.location.origin);
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (!target.searchParams.has(key)) target.searchParams.set(key, value);
  }
  return target.href;
}
