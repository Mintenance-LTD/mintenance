'use client';

/**
 * Job-row sub-components for the landing hero device mock
 * (HeroMock) — Direction A · Mint Editorial. Extracted so HeroMock
 * stays under the 500-line per-file cap.
 */

/** A job row in the browser-mock dashboard. */
export function MockJobRow({
  avatar,
  avatarWarn,
  title,
  meta,
  price,
  tag,
  tagBrand,
}: {
  avatar: string;
  avatarWarn?: boolean;
  title: string;
  meta: string;
  price: string;
  tag: string;
  tagBrand?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--me-surface)',
        border: '1px solid var(--me-line-2)',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 9999,
          display: 'grid',
          placeItems: 'center',
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
          background: avatarWarn ? 'var(--me-warn-bg)' : 'var(--me-brand-soft)',
          color: avatarWarn ? 'var(--me-warn-fg)' : 'var(--me-brand)',
        }}
      >
        {avatar}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 9, color: 'var(--me-ink-3)' }}>{meta}</div>
      </div>
      <div style={{ fontFamily: 'var(--me-font-display)', fontSize: 15 }}>
        {price}
      </div>
      <div
        style={{
          padding: '2px 6px',
          borderRadius: 9999,
          fontSize: 9,
          fontWeight: 700,
          background: tagBrand ? 'var(--me-brand-soft)' : 'var(--me-warn-bg)',
          color: tagBrand ? 'var(--me-brand)' : 'var(--me-warn-fg)',
        }}
      >
        {tag}
      </div>
    </div>
  );
}

/** A job row in the phone-mock screen. */
export function MockPhoneJob({
  title,
  meta,
  price,
  tag,
  tagBrand,
}: {
  title: string;
  meta: string;
  price: string;
  tag: string;
  tagBrand?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--me-surface)',
        border: '1px solid var(--me-line-2)',
        borderRadius: 10,
        padding: '8px 10px',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 600 }}>{title}</span>
        <span
          style={{
            padding: '1px 5px',
            borderRadius: 9999,
            fontSize: 8,
            fontWeight: 700,
            background: tagBrand ? 'var(--me-brand-soft)' : 'var(--me-warn-bg)',
            color: tagBrand ? 'var(--me-brand)' : 'var(--me-warn-fg)',
          }}
        >
          {tag}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 8, color: 'var(--me-ink-3)' }}>{meta}</span>
        <span style={{ fontFamily: 'var(--me-font-display)', fontSize: 13 }}>
          {price}
        </span>
      </div>
    </div>
  );
}
