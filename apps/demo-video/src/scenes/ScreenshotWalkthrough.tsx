import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const screens = [
  {
    src: 'screenshots/homeowner-dashboard.png',
    label: 'Homeowner Dashboard',
    desc: 'Track revenue, jobs, bids, and weekly performance at a glance',
  },
  {
    src: 'screenshots/homeowner-jobs.png',
    label: 'Job Management',
    desc: 'Post jobs, manage bids, and track progress in real-time',
  },
  {
    src: 'screenshots/contractor-dashboard-enhanced.png',
    label: 'Contractor Dashboard',
    desc: 'Manage projects, tasks, and payments from one view',
  },
];

export const ScreenshotWalkthrough: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalDuration = 210;
  const perScreen = totalDuration / screens.length;

  const activeIndex = Math.min(
    Math.floor(frame / perScreen),
    screens.length - 1
  );
  const localFrame = frame - activeIndex * perScreen;

  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(160deg, #020617 0%, #0F172A 50%, #0F2A1F 100%)',
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
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#3B82F6',
              fontFamily: 'Inter, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 4,
              marginBottom: 10,
            }}
          >
            Inside the App
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: -1,
            }}
          >
            Designed for clarity
          </div>
        </div>

        {/* Screenshot + info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 60,
            width: '100%',
            maxWidth: 1400,
          }}
        >
          {/* Screenshot with device frame */}
          <div
            style={{
              flex: '0 0 900px',
              position: 'relative',
            }}
          >
            {screens.map((screen, i) => {
              const isActive = i === activeIndex;
              const enterFrame = i * perScreen;
              const imgOpacity = interpolate(
                frame,
                [
                  enterFrame,
                  enterFrame + 15,
                  enterFrame + perScreen - 15,
                  enterFrame + perScreen,
                ],
                [0, 1, 1, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              const imgScale = interpolate(
                frame,
                [enterFrame, enterFrame + 20],
                [0.95, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              // Slow pan effect
              const panX = interpolate(
                frame,
                [enterFrame, enterFrame + perScreen],
                [0, -10],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );

              return (
                <div
                  key={screen.src}
                  style={{
                    position: i === 0 ? 'relative' : 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    opacity: imgOpacity,
                    transform: `scale(${imgScale}) translateX(${panX}px)`,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      boxShadow:
                        '0 25px 80px rgba(0,0,0,0.6), 0 0 40px rgba(16,185,129,0.1)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Browser chrome */}
                    <div
                      style={{
                        background: '#1E293B',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: '#EF4444',
                        }}
                      />
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: '#F59E0B',
                        }}
                      />
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: '#10B981',
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          marginLeft: 12,
                          background: '#0F172A',
                          borderRadius: 6,
                          padding: '6px 14px',
                          fontSize: 13,
                          color: '#64748B',
                          fontFamily: 'monospace',
                        }}
                      >
                        app.mintenance.co.uk
                      </div>
                    </div>
                    <Img
                      src={staticFile(screen.src)}
                      style={{
                        width: '100%',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info panel */}
          <div style={{ flex: 1 }}>
            {screens.map((screen, i) => {
              const enterFrame = i * perScreen;
              const textOpacity = interpolate(
                frame,
                [
                  enterFrame + 10,
                  enterFrame + 25,
                  enterFrame + perScreen - 20,
                  enterFrame + perScreen,
                ],
                [0, 1, 1, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              const textY = interpolate(
                frame,
                [enterFrame + 10, enterFrame + 25],
                [20, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );

              return (
                <div
                  key={screen.label}
                  style={{
                    position: i === 0 ? 'relative' : 'absolute',
                    top: i === 0 ? undefined : '50%',
                    right: i === 0 ? undefined : 80,
                    transform:
                      i === 0
                        ? `translateY(${textY}px)`
                        : `translateY(calc(-50% + ${textY}px))`,
                    opacity: textOpacity,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#10B981',
                      fontFamily: 'Inter, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: 3,
                      marginBottom: 12,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')} /{' '}
                    {String(screens.length).padStart(2, '0')}
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: 'white',
                      fontFamily: 'Inter, sans-serif',
                      marginBottom: 14,
                      lineHeight: 1.2,
                    }}
                  >
                    {screen.label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      color: '#94A3B8',
                      fontFamily: 'Inter, sans-serif',
                      lineHeight: 1.6,
                    }}
                  >
                    {screen.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 36,
          }}
        >
          {screens.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === activeIndex ? 32 : 10,
                height: 10,
                borderRadius: 5,
                background:
                  i === activeIndex ? '#10B981' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
