import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const titleOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [20, 45], [40, 0], {
    extrapolateRight: 'clamp',
  });
  const taglineOpacity = interpolate(frame, [50, 75], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const houseOpacity = interpolate(frame, [10, 40], [0, 0.3], {
    extrapolateRight: 'clamp',
  });
  const houseScale = interpolate(frame, [10, 180], [1, 1.08], {
    extrapolateRight: 'clamp',
  });
  const glowPulse = interpolate(
    frame,
    [0, 45, 90, 135, 180],
    [0.4, 0.7, 0.4, 0.7, 0.4]
  );
  const badgeOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const badgeY = interpolate(frame, [80, 100], [20, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 50% 60%, #0F2A1F 0%, #0F172A 60%, #020617 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Holographic house background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${houseScale})`,
          opacity: houseOpacity,
          width: 700,
          height: 700,
        }}
      >
        <Img
          src={staticFile('hero-assets/house.png')}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Glow effect */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(16,185,129,${glowPulse * 0.15}) 0%, transparent 70%)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          zIndex: 10,
          position: 'relative',
        }}
      >
        {/* Logo icon */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            width: 90,
            height: 90,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 0 60px rgba(16,185,129,0.4)',
          }}
        >
          <svg
            width='50'
            height='50'
            viewBox='0 0 24 24'
            fill='none'
            stroke='white'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
            <polyline points='9 22 9 12 15 12 15 22' />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 82,
            fontWeight: 800,
            color: 'white',
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            letterSpacing: -2,
          }}
        >
          Mintenance
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            fontSize: 28,
            color: '#94A3B8',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            marginTop: 16,
            letterSpacing: 0.5,
          }}
        >
          Find Trusted Contractors For Your Home Projects
        </div>

        {/* Badge */}
        <div
          style={{
            opacity: badgeOpacity,
            transform: `translateY(${badgeY}px)`,
            marginTop: 40,
            display: 'flex',
            gap: 16,
          }}
        >
          {['AI-Powered', 'Secure Escrow', 'Verified Pros'].map((label) => (
            <div
              key={label}
              style={{
                padding: '10px 24px',
                borderRadius: 100,
                border: '1px solid rgba(16,185,129,0.3)',
                background: 'rgba(16,185,129,0.08)',
                color: '#10B981',
                fontSize: 16,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
