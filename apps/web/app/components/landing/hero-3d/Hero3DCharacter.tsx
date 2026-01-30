'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

const BODY_COLOR = '#475569';
const HEAD_COLOR = '#e8b896';
const HAT_COLOR = '#f59e0b';
const TABLET_COLOR = '#14b8a6';

export function Hero3DCharacter() {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (g) g.rotation.y += delta * 0.15;
  });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]} scale={1.2}>
      {/* Torso */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={HEAD_COLOR} roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Hard hat */}
      <mesh position={[0, 1.45, 0.05]} rotation={[0.15, 0, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.32, 0.12, 16]} />
        <meshStandardMaterial color={HAT_COLOR} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Arm holding tablet (right) */}
      <group position={[0.35, 0.7, 0.2]} rotation={[0, 0, -0.4]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.05, 0.4, 4, 8]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0.15, -0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <boxGeometry args={[0.2, 0.28, 0.02]} />
          <meshStandardMaterial color={TABLET_COLOR} roughness={0.3} metalness={0.2} emissive={TABLET_COLOR} emissiveIntensity={0.15} />
        </mesh>
      </group>

      {/* Thumbs-up arm (left) */}
      <group position={[-0.3, 0.75, 0.15]} rotation={[0, 0, 0.35]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.05, 0.35, 4, 8]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.7} metalness={0.1} />
        </mesh>
      </group>

      {/* Legs */}
      <mesh position={[-0.12, -0.15, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.75} metalness={0.05} />
      </mesh>
      <mesh position={[0.12, -0.15, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.75} metalness={0.05} />
      </mesh>
    </group>
  );
}
