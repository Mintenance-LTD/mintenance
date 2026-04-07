import { AbsoluteFill, Series } from 'remotion';
import { IntroScene } from './scenes/IntroScene';
import { ProblemScene } from './scenes/ProblemScene';
import { FeatureShowcase } from './scenes/FeatureShowcase';
import { ScreenshotWalkthrough } from './scenes/ScreenshotWalkthrough';
import { HowItWorksScene } from './scenes/HowItWorksScene';
import { CtaScene } from './scenes/CtaScene';

// 30fps * 32s = 960 frames total
export const MintenanceDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A' }}>
      <Series>
        <Series.Sequence durationInFrames={180}>
          <IntroScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <ProblemScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={210}>
          <FeatureShowcase />
        </Series.Sequence>
        <Series.Sequence durationInFrames={210}>
          <ScreenshotWalkthrough />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <HowItWorksScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <CtaScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
