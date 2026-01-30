'use client';

import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Hero3DCharacter } from './Hero3DCharacter';

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
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} castShadow shadow-mapSize={[512, 512]} />
      <directionalLight position={[-3, 4, 3]} intensity={0.4} />
      <pointLight position={[0, 2, 2]} intensity={0.3} color="#14b8a6" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={1} metalness={0} />
      </mesh>
      <Hero3DCharacter />
    </>
  );
}

export function Hero3DScene() {
  return (
    <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl overflow-hidden bg-transparent">
      <Canvas
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 0, 4.5], fov: 42, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        shadows
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
