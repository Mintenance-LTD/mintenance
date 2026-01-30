'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

const BODY_COLOR = '#475569';
const HEAD_COLOR = '#e8b896';
const HAT_COLOR = '#f59e0b';
const HAND_COLOR = '#e8b896';

const COME_OUT_DURATION = 1.8;
const EASE_OUT_CUBIC = (t: number) => 1 - (1 - t) ** 3;

export function TradespersonHouseCharacter() {
  const groupRef = useRef<Group>(null);
  const thumbRef = useRef<Group>(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    const g = groupRef.current;
    const t = thumbRef.current;
    if (!g) return;

    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta / COME_OUT_DURATION);
    }
    const p = EASE_OUT_CUBIC(progressRef.current);
    const baseZ = -0.35;
    const endZ = 0.25;
    g.position.z = baseZ + (endZ - baseZ) * p;

    const idle = progressRef.current >= 1;
    const bob = idle ? Math.sin(_.clock.elapsedTime * 1.2) * 0.012 : 0;
    g.position.y = -0.5 + bob;

    if (idle && t) {
      const wiggle = Math.sin(_.clock.elapsedTime * 2.5) * 0.08;
      t.rotation.z = wiggle;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, -0.35]} scale={0.9}>
      {/* Torso */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.2, 0.45, 4, 8]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={HEAD_COLOR} roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Hard hat */}
      <mesh position={[0, 1.32, 0.04]} rotation={[0.12, 0, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.1, 16]} />
        <meshStandardMaterial color={HAT_COLOR} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Thumbs-up arm (right): upper arm + forearm + hand */}
      <group position={[0.32, 0.72, 0.1]} rotation={[0.1, 0, -0.5]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.045, 0.2, 4, 6]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.7} metalness={0.1} />
        </mesh>
        <group position={[0.12, -0.18, 0]} rotation={[0.3, 0, 0.2]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.04, 0.18, 4, 6]} />
            <meshStandardMaterial color={BODY_COLOR} roughness={0.7} metalness={0.1} />
          </mesh>
          {/* Hand: palm + thumb up */}
          <group ref={thumbRef} position={[0.06, -0.12, 0.02]} rotation={[0, 0, -Math.PI / 2]}>
            <mesh position={[0.02, 0, 0]} castShadow>
              <boxGeometry args={[0.06, 0.05, 0.03]} />
              <meshStandardMaterial color={HAND_COLOR} roughness={0.8} metalness={0.05} />
            </mesh>
            <mesh position={[0.04, 0.04, 0]} rotation={[0, 0, -0.3]} castShadow>
              <boxGeometry args={[0.025, 0.055, 0.022]} />
              <meshStandardMaterial color={HAND_COLOR} roughness={0.8} metalness={0.05} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Other arm (left), relaxed */}
      <group position={[-0.28, 0.65, 0.05]} rotation={[0.05, 0, 0.25]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.045, 0.35, 4, 6]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.7} metalness={0.1} />
        </mesh>
      </group>

      {/* Legs */}
      <mesh position={[-0.1, -0.12, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.3, 4, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.75} metalness={0.05} />
      </mesh>
      <mesh position={[0.1, -0.12, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.3, 4, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.75} metalness={0.05} />
      </mesh>
    </group>
  );
}
