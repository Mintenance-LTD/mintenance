export const usePathname = () =>
  new URLSearchParams(window.location.search).get('role') === 'contractor'
    ? '/contractor/dashboard-enhanced'
    : '/dashboard';
export const useRouter = () => ({
  push: (href: string) => {
    window.location.href = href;
  },
  refresh: () => {},
});
