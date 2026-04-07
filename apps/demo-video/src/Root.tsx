import { Composition } from 'remotion';
import { MintenanceDemo } from './MintenanceDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id='MintenanceDemo'
      component={MintenanceDemo}
      durationInFrames={30 * 32}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
