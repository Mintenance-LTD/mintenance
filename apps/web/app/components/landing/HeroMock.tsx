'use client';

import { Sparkles } from 'lucide-react';
import { MockJobRow, MockPhoneJob } from './HeroMockRows';

/**
 * Hero device mock — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html `.hero-mock`.
 *
 * A browser window (homeowner web dashboard) with an overlapping
 * phone (the same data in the mobile app), plus two floating accent
 * cards — a Mint AI tooltip and a pulsing escrow pill. All colours
 * are `--me-*` tokens; the only literal hex is the three macOS
 * traffic-light dots, which have no design token.
 *
 * Desktop composition — hidden below 1024px by the `.hero-mock-wrap`
 * class (media query lives in HeroSection).
 */
export function HeroMock() {
  return (
    <div
      className='hero-mock-wrap'
      style={{ position: 'relative', height: 620 }}
      aria-hidden='true'
    >
      {/* ── Browser / web app ─────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 30,
          right: -60,
          width: 720,
          height: 460,
          borderRadius: 14,
          background: 'var(--me-surface)',
          border: '1px solid var(--me-line)',
          boxShadow:
            '0 30px 80px rgba(31,42,36,0.18), 0 8px 18px rgba(31,42,36,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* browser bar */}
        <div
          style={{
            height: 32,
            background: 'var(--me-bg-2)',
            borderBottom: '1px solid var(--me-line-2)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 6,
          }}
        >
          {['#FF6058', '#FFBD2E', '#28C941'].map((c) => (
            <span
              key={c}
              style={{
                width: 9,
                height: 9,
                borderRadius: 9999,
                background: c,
              }}
            />
          ))}
          <span
            style={{
              marginLeft: 14,
              flex: 1,
              maxWidth: 360,
              height: 18,
              borderRadius: 6,
              background: 'var(--me-surface)',
              border: '1px solid var(--me-line-2)',
              fontSize: 10,
              color: 'var(--me-ink-3)',
              padding: '2px 8px',
              lineHeight: '14px',
            }}
          >
            app.mintenance.co.uk/dashboard
          </span>
        </div>

        {/* browser body */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr',
            height: 'calc(100% - 32px)',
          }}
        >
          {/* sidebar */}
          <div
            style={{
              background: 'var(--me-bg-2)',
              padding: '14px 10px',
              borderRight: '1px solid var(--me-line-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--me-font-display)',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: 'var(--me-brand)',
                }}
              />
              Mintenance
            </div>
            <div
              style={{
                background: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
                padding: '7px 10px',
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              + Post a job
            </div>
            {[
              ['Dashboard', true],
              ['Jobs', false],
              ['Properties', false],
              ['Messages', false],
              ['Payments', false],
            ].map(([label, on]) => (
              <div
                key={String(label)}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  marginBottom: 2,
                  background: on ? 'var(--me-surface)' : 'transparent',
                  color: on ? 'var(--me-ink)' : 'var(--me-ink-2)',
                  fontWeight: on ? 600 : 400,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: on ? 'var(--me-brand)' : 'var(--me-ink-4)',
                    opacity: on ? 1 : 0.55,
                  }}
                />
                {label}
              </div>
            ))}
          </div>

          {/* main */}
          <div style={{ padding: '16px 18px', overflow: 'hidden' }}>
            <div
              style={{
                fontFamily: 'var(--me-font-display)',
                fontSize: 22,
                letterSpacing: '-0.012em',
                marginBottom: 4,
              }}
            >
              Good morning, Sarah
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--me-ink-3)',
                marginBottom: 14,
              }}
            >
              2 active jobs · 1 awaiting your sign-off
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {[
                ['Open', '2'],
                ['In progress', '1'],
                ['In escrow', '£340'],
              ].map(([l, v]) => (
                <div
                  key={l}
                  style={{
                    background: 'var(--me-bg-2)',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: 'var(--me-ink-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      fontWeight: 600,
                    }}
                  >
                    {l}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--me-font-display)',
                      fontSize: 22,
                      letterSpacing: '-0.012em',
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <MockJobRow
              avatar='TR'
              title='Leaking kitchen tap'
              meta='Tomas R. · today 3pm'
              price='£95'
              tag='Booked'
              tagBrand
            />
            <MockJobRow
              avatar='PM'
              avatarWarn
              title='Boiler service · annual'
              meta='3 bids received'
              price='£180'
              tag='Review'
            />
          </div>
        </div>
      </div>

      {/* ── Phone / mobile app ────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          left: 0,
          width: 230,
          height: 470,
          borderRadius: 38,
          background: '#1a1a1a',
          padding: 10,
          boxShadow: '0 30px 60px rgba(31,42,36,0.25)',
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 30,
            background: 'var(--me-bg)',
            overflow: 'hidden',
            position: 'relative',
            padding: '26px 14px 16px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 80,
              height: 18,
              background: '#1a1a1a',
              borderRadius: 9999,
              zIndex: 3,
            }}
          />
          <div
            style={{
              fontFamily: 'var(--me-font-display)',
              fontSize: 19,
              letterSpacing: '-0.012em',
              marginTop: 10,
              marginBottom: 2,
            }}
          >
            Jobs
          </div>
          <div
            style={{
              fontSize: 9,
              color: 'var(--me-ink-3)',
              marginBottom: 10,
            }}
          >
            2 active · 1 awaiting
          </div>
          <div
            style={{
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              borderRadius: 10,
              padding: '9px 11px',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 8,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                opacity: 0.85,
                marginBottom: 2,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Sparkles size={8} aria-hidden='true' />
              Mint
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.4 }}>
              Tomas confirmed 3pm. Your tap should be flowing by tea time.
            </div>
          </div>
          <MockPhoneJob
            title='Leaking kitchen tap'
            meta='Today · 3pm'
            price='£95'
            tag='Booked'
            tagBrand
          />
          <MockPhoneJob
            title='Boiler service'
            meta='3 bids · from £180'
            price='£180'
            tag='Bids'
          />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 14,
              right: 14,
              background: 'var(--me-ink)',
              borderRadius: 9999,
              padding: '6px 10px',
              display: 'flex',
              justifyContent: 'space-around',
            }}
          >
            {[true, false, false, false].map((on, i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: on ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating accents ──────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 220,
          zIndex: 3,
          background: 'var(--me-surface)',
          border: '1px solid var(--me-line)',
          borderRadius: 14,
          padding: '12px 14px',
          maxWidth: 260,
          boxShadow: '0 14px 32px rgba(31,42,36,0.10)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          <Sparkles size={14} aria-hidden='true' />
        </span>
        <div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--me-ink-3)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              marginBottom: 2,
            }}
          >
            Mint AI
          </div>
          <div
            style={{ fontSize: 12, color: 'var(--me-ink)', lineHeight: 1.4 }}
          >
            Worn cartridge — typical fix £75–140 in SW18.
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 60,
          right: -30,
          zIndex: 3,
          background: 'var(--me-surface)',
          border: '1px solid var(--me-line)',
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: '0 14px 32px rgba(31,42,36,0.10)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: 'var(--me-brand)',
            boxShadow: '0 0 0 4px rgba(63,140,122,0.18)',
          }}
        />
        <span>£340 held in escrow</span>
      </div>
    </div>
  );
}
