import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const features = [
  {
    icon: '🤖',
    title: 'AI Building Surveyor',
    desc: 'Upload a photo, get instant damage assessment with repair cost estimates',
    color: '#8B5CF6',
  },
  {
    icon: '🔒',
    title: 'Secure Escrow',
    desc: 'Payments held safely until work is completed and approved',
    color: '#10B981',
  },
  {
    icon: '📸',
    title: 'Photo Verification',
    desc: 'Before & after photos required — visual proof of completed work',
    color: '#3B82F6',
  },
  {
    icon: '⚡',
    title: 'Smart Matching',
    desc: 'Swipe through vetted contractors matched to your specific job',
    color: '#F59E0B',
  },
  {
    icon: '💬',
    title: 'Real-Time Messaging',
    desc: 'Built-in chat with contractors — no need for external apps',
    color: '#EC4899',
  },
  {
    icon: '📊',
    title: 'Full Dashboard',
    desc: 'Track jobs, bids, payments, and reviews all in one place',
    color: '#06B6D4',
  },
];

export const FeatureShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const headlineY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, #0F2A1F 0%, #0F172A 50%, #020617 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '0 100px',
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            textAlign: 'center',
            marginBottom: 56,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#10B981',
              fontFamily: 'Inter, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 4,
              marginBottom: 12,
            }}
          >
            Features
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: -1,
            }}
          >
            Everything you need, built in
          </div>
        </div>

        {/* Feature grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            justifyContent: 'center',
            maxWidth: 1200,
          }}
        >
          {features.map((feature, i) => {
            const delay = 25 + i * 14;
            const s = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14 },
            });
            const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={feature.title}
                style={{
                  opacity,
                  transform: `scale(${Math.min(s, 1)})`,
                  background: `linear-gradient(135deg, ${feature.color}08, ${feature.color}04)`,
                  border: `1px solid ${feature.color}25`,
                  borderRadius: 20,
                  padding: '32px 30px',
                  width: 360,
                }}
              >
                <div style={{ fontSize: 38, marginBottom: 14 }}>
                  {feature.icon}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'Inter, sans-serif',
                    marginBottom: 8,
                  }}
                >
                  {feature.title}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: '#94A3B8',
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: 1.5,
                  }}
                >
                  {feature.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
