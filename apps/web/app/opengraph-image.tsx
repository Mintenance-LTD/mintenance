import { ImageResponse } from 'next/og';
export const alt = 'Mintenance — Home, taken care of.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#edf4ef',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        color: '#19352b',
      }}
    >
      <div style={{ fontSize: 32 }}>Mintenance</div>
      <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -3 }}>
        Home, taken care of.
      </div>
      <div style={{ fontSize: 28, color: '#357a69' }}>
        Find local tradespeople. Keep every job in one place.
      </div>
    </div>,
    size
  );
}
