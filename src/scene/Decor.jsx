import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useLoader, useFrame } from '@react-three/fiber';
import { BRAND } from '../config';
import { storeState } from '../utils/registry';

const CEILING_HEIGHT = 3.2;
const SIGN_DIMS = [1.1, 0.26, 0.025];
const SIGN_Y = 2.72;
const SIGN_Z = 0.6;
const CABLE_OFFSET_X = 0.1;

const POSTER_DIMS = [0.6, 0.9];
const POSTER_Y = 1.5;
const POSTER_FRAME_BORDER = 0.15;
const POSTER_MAT_BORDER = 0.05;
const POSTER_DEPTH = 0.03;

export const POSTERS_BY_SECTION = {
  clothing: [
    [-2.55, 'poster-2'],
    [2.55, 'poster-7']
  ],
  shoes: [
    [-2.15, 'poster-1'],
    [2.15, 'poster-6']
  ],
  bags: [
    [-2.15, 'poster-4'],
    [2.15, 'poster-8']
  ],
  caps: [
    [-2.15, 'poster-3'],
    [2.15, 'poster-5']
  ]
};

// Hanging Section Sign (CLOTHING, SHOES, BAGS, CAPS)
export function SectionSign({ sectionId }) {
  const texture = useLoader(THREE.TextureLoader, `/decor/signs/${sectionId}.webp`);
  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    }
  }, [texture]);

  const [w, h, d] = SIGN_DIMS;
  const cableLength = CEILING_HEIGHT - (SIGN_Y + h / 2);

  return (
    <group position={[0, SIGN_Y, SIGN_Z]}>
      {/* Signboard Backing */}
      <mesh>
        <boxGeometry args={SIGN_DIMS} />
        <meshStandardMaterial color="#f5f4f0" roughness={0.8} />
      </mesh>

      {/* Printed Front Face */}
      <mesh position={[0, 0, d / 2 + 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.8} />
      </mesh>

      {/* Twin Suspension Wires to Ceiling */}
      {[-1, 1].map((dir) => (
        <mesh
          key={dir}
          position={[dir * (w / 2 - CABLE_OFFSET_X), h / 2 + cableLength / 2, 0]}
        >
          <cylinderGeometry args={[0.002, 0.002, cableLength, 8]} />
          <meshStandardMaterial color="#6a6864" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// Framed Wall Posters
export function WallPoster({ x, name }) {
  const texture = useLoader(THREE.TextureLoader, `/decor/posters/${name}.webp`);
  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    }
  }, [texture]);

  const [pw, ph] = POSTER_DIMS;

  return (
    <group position={[x, POSTER_Y, 0]}>
      {/* Black Outer Frame */}
      <mesh position={[0, 0, POSTER_DEPTH / 2]} castShadow>
        <boxGeometry args={[pw + POSTER_FRAME_BORDER, ph + POSTER_FRAME_BORDER, POSTER_DEPTH]} />
        <meshStandardMaterial color="#1b1b1b" roughness={0.45} />
      </mesh>

      {/* Off-White Inner Mat Board */}
      <mesh position={[0, 0, 0.031]} receiveShadow>
        <planeGeometry args={[pw + 2 * POSTER_MAT_BORDER, ph + 2 * POSTER_MAT_BORDER]} />
        <meshStandardMaterial color="#f4f2ec" roughness={0.9} />
      </mesh>

      {/* Poster Art Print */}
      <mesh position={[0, 0, 0.032]} receiveShadow>
        <planeGeometry args={[pw, ph]} />
        <meshStandardMaterial map={texture} roughness={0.55} />
      </mesh>
    </group>
  );
}

// 3D NIKE Wordmark Sign on the Clothing Rail
export function NikeWordmark3D({ position = [0, 0.45, 0.002], height = 0.32 }) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = "italic 900 200px 'Helvetica Neue', Helvetica, Arial, sans-serif";
    ctx.font = font;
    const textWidth = Math.ceil(ctx.measureText(BRAND.name).width) + 80;
    canvas.width = textWidth;
    canvas.height = 260;
    ctx.font = font;
    ctx.fillStyle = '#111111';
    ctx.textBaseline = 'middle';
    ctx.fillText(BRAND.name, 40, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { texture: tex, aspect: canvas.width / canvas.height };
  }, []);

  const meshRef = useRef();
  const matRef = useRef();

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const targetOpacity = storeState.productOpen ? 0 : 1;
    matRef.current.opacity = THREE.MathUtils.damp(
      matRef.current.opacity,
      targetOpacity,
      6,
      Math.min(delta, 0.05)
    );
    if (meshRef.current) {
      meshRef.current.visible = matRef.current.opacity > 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[height * aspect, height]} />
      <meshStandardMaterial
        ref={matRef}
        map={texture}
        transparent
        alphaTest={0.01}
        depthWrite={false}
        roughness={0.9}
      />
    </mesh>
  );
}
