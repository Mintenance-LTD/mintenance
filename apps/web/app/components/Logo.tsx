import Image from 'next/image';

export default function Logo({
  width = 32,
  height = 32,
  className
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src="/assets/icon.png"
      alt="Mintenance Logo"
      width={width}
      height={height}
      className={className}
      style={{ display: 'block' }}
    />
  );
}
