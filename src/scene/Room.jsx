import React, { useMemo } from 'react';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import { PALETTE } from '../config';
import { SECTION_CONFIG } from '../data/products';

const ROOM_SIZE = 7;
const CEILING_HEIGHT = 3.2;
const LIGHT_POSITIONS = [-1.6, 0, 1.6];
const DOT_REPEAT_SCALE = 0.09;

function createWallTexture(dotted = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, 64, 64);

  if (dotted) {
    ctx.fillStyle = PALETTE.wallDot;
    ctx.beginPath();
    ctx.arc(32, 32, 5.44, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(ROOM_SIZE / DOT_REPEAT_SCALE, CEILING_HEIGHT / DOT_REPEAT_SCALE);
  texture.anisotropy = 8;
  return texture;
}

export function Room() {
  const wallTextures = useMemo(
    () => ({
      dotted: createWallTexture(true),
      plain: createWallTexture(false)
    }),
    []
  );

  return (
    <group>
      {/* 4 Room Walls aligned with sections */}
      {Object.values(SECTION_CONFIG).map((sec) => (
        <group
          key={sec.id}
          position={sec.origin}
          rotation={[0, sec.rotation, 0]}
        >
          <mesh position={[0, CEILING_HEIGHT / 2, 0]} receiveShadow>
            <planeGeometry args={[ROOM_SIZE, CEILING_HEIGHT]} />
            <meshStandardMaterial
              map={wallTextures[sec.wall || 'plain']}
              roughness={0.95}
              envMapIntensity={0.75}
            />
          </mesh>
        </group>
      ))}

      {/* Floor with Realistic Soft Mirror Reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <MeshReflectorMaterial
          color={PALETTE.floor}
          resolution={1024}
          blur={[400, 100]}
          mixBlur={1}
          mixStrength={0.6}
          roughness={0.85}
          metalness={0.1}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          mirror={0}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CEILING_HEIGHT, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial
          color={PALETTE.ceiling}
          emissive={PALETTE.ceiling}
          emissiveIntensity={0.55}
          roughness={1}
        />
      </mesh>

      {/* Ceiling Light Strips */}
      {LIGHT_POSITIONS.map((z) => (
        <mesh
          key={z}
          position={[0, CEILING_HEIGHT - 0.01, z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[5.4, 0.09]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
