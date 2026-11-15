import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ProductBillboard } from './ProductBillboard';
import { PRODUCTS_BY_SECTION } from '../data/products';
import { registerItem, storeState } from '../utils/registry';
import { createSpring, smoothDamp } from '../utils/spring';

const BACKBOARD_DIMS = [2.3, 1.65, 0.03];
const BACKBOARD_Y = 1.32;
const COLS = [-0.72, 0, 0.72];
const ROWS = [1.78, 1.3, 0.82];
const PEDESTAL_DIMS = [0.44, 0.022, 0.2];

// Procedural Oak Wood Grain Canvas Texture
function createWoodTexture(baseColor, grainColor, repeat = [1, 1]) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = grainColor;

  for (let i = 0; i < 70; i++) {
    const y = Math.random() * 256;
    ctx.globalAlpha = 0.08 + Math.random() * 0.18;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) {
      ctx.lineTo(x, y + Math.sin((x / 256) * Math.PI * 2 + i) * 3);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 8;
  return texture;
}

// Soft Radial Drop Shadow Texture
function createRadialShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ShoeItem({ product, position, onOpen }) {
  const groupRef = useRef();
  const shadowMatRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const turnRef = useRef(0);
  const fadeRef = useRef(1);

  const springLift = useRef(createSpring(0));
  const springTurn = useRef(createSpring(0));

  useEffect(() => {
    if (groupRef.current) {
      return registerItem(product.id, {
        object: groupRef.current,
        turnRef,
        fadeRef,
        drop: 0
      });
    }
  }, [product.id]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const targetLift = isHovered ? 1 : 0;
    const liftVal = smoothDamp(springLift.current, targetLift, 0.18, dt);

    if (groupRef.current) {
      groupRef.current.position.y = 0.03 * liftVal;
    }

    const targetTurn = isHovered ? 0.35 : 0;
    turnRef.current = smoothDamp(springTurn.current, targetTurn, 0.22, dt);

    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = 0.4 * (1 - 0.75 * liftVal) * fadeRef.current;
    }
  });

  return (
    <group position={position}>
      {/* Radial Drop Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} renderOrder={1}>
        <planeGeometry args={[0.34, 0.14]} />
        <meshBasicMaterial
          ref={shadowMatRef}
          map={useMemo(() => createRadialShadowTexture(), [])}
          color="#000000"
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Interactive Shoe Group */}
      <group
        ref={groupRef}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setIsHovered(false);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          storeState.tapHandled = true;
          onOpen(product.id);
        }}
      >
        <ProductBillboard
          photos={product.photos}
          turnRef={turnRef}
          fadeRef={fadeRef}
        />
      </group>
    </group>
  );
}

export function ShoesDisplay({ onOpenProduct }) {
  const shoes = PRODUCTS_BY_SECTION.shoes;
  const woodTexture = useMemo(() => createWoodTexture('#c8a272', '#8a6538', [2.3, 1.65]), []);

  return (
    <group>
      {/* Oak Wood Back Panel */}
      <mesh position={[0, BACKBOARD_Y, BACKBOARD_DIMS[2] / 2]} receiveShadow>
        <boxGeometry args={BACKBOARD_DIMS} />
        <meshStandardMaterial map={woodTexture} roughness={0.8} />
      </mesh>

      {/* 9 White Pedestals */}
      {ROWS.map((rowY) =>
        COLS.map((colX) => (
          <mesh
            key={`${colX}:${rowY}`}
            position={[colX, rowY - PEDESTAL_DIMS[1] / 2, BACKBOARD_DIMS[2] + PEDESTAL_DIMS[2] / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={PEDESTAL_DIMS} />
            <meshStandardMaterial color="#f6f5f2" roughness={0.45} />
          </mesh>
        ))
      )}

      {/* 9 Shoes (3x3 Grid) */}
      <React.Suspense fallback={null}>
        {shoes.map((shoe, idx) => (
          <ShoeItem
            key={shoe.id}
            product={shoe}
            position={[
              COLS[idx % 3],
              ROWS[Math.floor(idx / 3)],
              BACKBOARD_DIMS[2] + PEDESTAL_DIMS[2] / 2
            ]}
            onOpen={onOpenProduct}
          />
        ))}
      </React.Suspense>
    </group>
  );
}
