'use client';

const WALL_COLOR = '#334155';
const ROOF_COLOR = '#1e293b';
const DOOR_COLOR = '#475569';

export function SimpleHouse() {
  return (
    <group position={[0, -0.2, -0.15]} scale={0.85}>
      {/* Main body */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.8, 0.9]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Roof (flat top) */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.12, 0.95]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Door (front face, same Z as front = +0.45) */}
      <mesh position={[0, 0.2, 0.46]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.04]} />
        <meshStandardMaterial color={DOOR_COLOR} roughness={0.8} metalness={0.05} />
      </mesh>
    </group>
  );
}
