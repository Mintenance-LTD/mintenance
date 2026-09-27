'use client';

import { useEffect, useState } from 'react';

/** Keep server and first client render identical before activating the font CSS. */
export function DeferredFontStylesheet({ href }: { href: string }) {
  const [active, setActive] = useState(false);
  useEffect(() => setActive(true), []);
  return (
    <link
      rel='stylesheet'
      href={href}
      media={active ? 'all' : 'print'}
      crossOrigin='anonymous'
    />
  );
}
