import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const steps = [
  {
    num: '1',
    title: 'Post a Job',
    desc: 'Describe the work, add photos',
    icon: '📝',
  },
  {
    num: '2',
    title: 'Get Bids',
    desc: 'Verified contractors compete',
    icon: '🏷️',
  },
  {
    num: '3',
    title: 'Pay into Escrow',
    desc: 'Money held securely',
    icon: '🔐',
  },
  {
    num: '4',
    title: 'Work Completed',
    desc: 'Before & after proof',
    icon: '✅',
  },
  { num: '5', title: 'Release Payment', desc: 'Approve and pay', icon: '💰' },
];

export const HowItWorksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #020617 0%, #0F172A 100%)',
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
          padding: '0 80px',
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headlineOpacity,
            textAlign: 'center',
            marginBottom: 64,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#F59E0B',
              fontFamily: 'Inter, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 4,
              marginBottom: 10,
            }}
          >
            How It Works
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: -1,
            }}
          >
            5 simple steps
          </div>
        </div>

        {/* Timeline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
            position: 'relative',
          }}
        >
          {steps.map((step, i) => {
            const delay = 15 + i * 14;
            const s = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12 },
            });
            const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            // Progress line
            const lineProgress = interpolate(
              frame,
              [delay + 5, delay + 18],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );

            return (
              <div
                key={step.num}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 200,
                  opacity,
                  transform: `scale(${Math.min(s, 1)})`,
                }}
              >
                {/* Circle with icon */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
                    border: '2px solid rgba(16,185,129,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                    marginBottom: 18,
                  }}
                >
                  {step.icon}
                </div>

                {/* Text */}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'Inter, sans-serif',
                    marginBottom: 6,
                    textAlign: 'center',
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: '#64748B',
                    fontFamily: 'Inter, sans-serif',
                    textAlign: 'center',
                  }}
                >
                  {step.desc}
                </div>

                {/* Connector line (between steps) */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 40,
                      left: `calc(${(i + 0.5) * 20}% + 50px)`,
                      width: `calc(20% - 60px)`,
                      height: 2,
                      background: `linear-gradient(90deg, rgba(16,185,129,${lineProgress * 0.4}), rgba(16,185,129,${lineProgress * 0.1}))`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
