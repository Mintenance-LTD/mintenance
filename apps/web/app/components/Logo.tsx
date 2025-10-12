'use client';

export default function Logo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  return (
    <img
      src="/assets/icon.png"
      alt="Mintenance Logo"
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  );
}
