'use client';

import Image from 'next/image';

export default function Logo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  return (
    <Image
      src="/assets/icon.png"
      alt="Mintenance Logo"
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  );
}
