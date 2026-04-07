import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 10 } });
  const titleOpacity = interpolate(frame, [5, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [5, 25], [40, 0], {
    extrapolateRight: 'clamp',
  });
  const subtitleOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const buttonOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const buttonScale = spring({
    frame: frame - 40,
    fps,
    config: { damping: 8 },
  });
  const glowPulse = interpolate(frame, [0, 30, 60, 90], [0.3, 0.6, 0.3, 0.6]);

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 50% 50%, #0F2A1F 0%, #0F172A 40%, #020617 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Large glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(16,185,129,${glowPulse * 0.12}) 0%, transparent 60%)`,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${Math.min(scale, 1)})`,
            width: 72,
            height: 72,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
            boxShadow: '0 0 50px rgba(16,185,129,0.35)',
          }}
        >
          <svg
            width='40'
            height='40'
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

        {/* CTA Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 58,
            fontWeight: 800,
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: -2,
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: 800,
          }}
        >
          Ready to fix your home?
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            fontSize: 22,
            color: '#94A3B8',
            fontFamily: 'Inter, sans-serif',
            marginTop: 18,
            textAlign: 'center',
          }}
        >
          Join thousands of homeowners and contractors on Mintenance
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: buttonOpacity,
            transform: `scale(${Math.min(Math.max(buttonScale, 0), 1)})`,
            marginTop: 44,
            padding: '18px 48px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            fontSize: 22,
            fontWeight: 700,
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
            letterSpacing: 0.5,
          }}
        >
          Get Started Free
        </div>

        {/* URL */}
        <div
          style={{
            opacity: buttonOpacity,
            marginTop: 20,
            fontSize: 16,
            color: '#64748B',
            fontFamily: 'monospace',
            letterSpacing: 1,
          }}
        >
          mintenance.co.uk
        </div>
      </div>
    </AbsoluteFill>
  );
};
