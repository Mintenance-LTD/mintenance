import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const problems = [
  { icon: '🔍', text: 'Hard to find reliable contractors' },
  { icon: '💸', text: 'No payment protection for homeowners' },
  { icon: '📋', text: 'No transparency on job progress' },
  { icon: '⭐', text: 'Fake reviews, unverified tradespeople' },
];

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const headlineY = interpolate(frame, [0, 25], [30, 0], {
    extrapolateRight: 'clamp',
  });
  const lineWidth = interpolate(frame, [20, 50], [0, 120], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, #020617 0%, #0F172A 50%, #020617 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '0 120px',
          position: 'relative',
        }}
      >
        {/* Headline */}
        <div
          style={{
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#EF4444',
              fontFamily: 'Inter, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 4,
              marginBottom: 16,
            }}
          >
            The Problem
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: -1,
              lineHeight: 1.2,
            }}
          >
            Home maintenance is broken
          </div>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background:
              'linear-gradient(90deg, transparent, #EF4444, transparent)',
            borderRadius: 2,
            marginBottom: 60,
          }}
        />

        {/* Problem cards */}
        <div
          style={{
            display: 'flex',
            gap: 28,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {problems.map((problem, i) => {
            const delay = 35 + i * 18;
            const scale = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12 },
            });
            const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={problem.text}
                style={{
                  opacity,
                  transform: `scale(${Math.min(scale, 1)})`,
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 20,
                  padding: '36px 40px',
                  width: 380,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <div style={{ fontSize: 40 }}>{problem.icon}</div>
                <div
                  style={{
                    fontSize: 20,
                    color: '#CBD5E1',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {problem.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
