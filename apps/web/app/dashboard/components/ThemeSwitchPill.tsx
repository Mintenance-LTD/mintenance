/**
 * Floating theme switch for Phase-1 of the Mint Editorial rebrand.
 * Pure server-rendered links to /api/theme; no client JS required.
 */
export function ThemeSwitchPill({
  active,
}: {
  active: 'default' | 'mint-editorial';
}) {
  return (
    <div className='me-theme-switch' aria-label='Theme switch'>
      <a
        href='/api/theme?value=default&redirect=/dashboard'
        className={active === 'default' ? 'on' : ''}
      >
        Default
      </a>
      <a
        href='/api/theme?value=mint-editorial&redirect=/dashboard'
        className={active === 'mint-editorial' ? 'on' : ''}
      >
        Mint Editorial
      </a>
    </div>
  );
}
