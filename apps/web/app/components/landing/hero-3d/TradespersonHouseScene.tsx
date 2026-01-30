'use client';

import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { TradespersonHouseCharacter } from './TradespersonHouseCharacter';
import { SimpleHouse } from './SimpleHouse';

function TransparentBackground() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = null;
    return () => {
      scene.background = null;
    };
  }, [scene]);
  return null;
}

function SceneContent() {
  return (
    <>
      <TransparentBackground />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 5, 4]} intensity={1} castShadow shadow-mapSize={[512, 512]} />
      <directionalLight position={[-2, 3, 2]} intensity={0.35} />
      <pointLight position={[0, 2, 2]} intensity={0.25} color="#14b8a6" />
      <SimpleHouse />
      <TradespersonHouseCharacter />
    </>
  );
}

export function TradespersonHouseScene() {
  return (
    <div className="relative w-full h-full min-h-[280px] overflow-hidden bg-transparent">
      <Canvas
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 0.15, 2.2], fov: 38, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        shadows
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
