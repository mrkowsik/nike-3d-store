
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ProductBillboard } from './ProductBillboard';
import { PRODUCTS_BY_SECTION } from '../data/products';
import { registerItem, storeState } from '../utils/registry';
import { createSpring, smoothDamp } from '../utils/spring';

const BACKBOARD_DIMS = [2.3, 1.15, 0.02];
const BACKBOARD_Y = 1.45;
const CAP_COLS = [-0.81, -0.27, 0.27, 0.81];
const CAP_ROWS = [1.74, 1.22];
const CAP_Z = 0.11;

// Procedural Birch Pegboard Texture
function createBirchPegTexture(width, height, pitch = 0.05) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dcc7a0';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(60, 45, 30, 0.75)';
  ctx.beginPath();
  ctx.arc(32, 32, 5.76, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(width / pitch, height / pitch);
  texture.anisotropy = 8;
  return texture;
}

// Cap Brim Stand Bracket
function CapBracket({ brimDrop }) {
  const t = -brimDrop - 0.03;

  const { pos, quat, len } = useMemo(() => {
    const from = new THREE.Vector3(0, t + 0.008, BACKBOARD_DIMS[2] + 0.008);
    const to = new THREE.Vector3(0, 0, CAP_Z);
    const delta = to.clone().sub(from);
    const length = delta.length();
    const position = from.clone().add(to).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.clone().normalize()
    );
    return { pos: position, quat: quaternion, len: length };
  }, [t]);

  return (
    <group>
      {/* Wall Mounting Plate */}
      <mesh position={[0, t, BACKBOARD_DIMS[2] + 0.003]} castShadow>
        <boxGeometry args={[0.032, 0.022, 0.006]} />
        <meshStandardMaterial color="#d6d6d6" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Angled Support Rod */}
      <mesh position={pos} quaternion={quat} castShadow>
        <cylinderGeometry args={[0.004, 0.004, len, 12]} />
        <meshStandardMaterial color="#e8e8e8" metalness={1} roughness={0.12} />
      </mesh>
    </group>
  );
}

function CapItem({ product, position, brimDrop, onOpen }) {
  const groupRef = useRef();
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
      groupRef.current.position.y = 0.01 * liftVal;
      groupRef.current.position.z = position[2] + 0.05 * liftVal;
    }

    const targetTurn = isHovered ? 0.35 : 0;
    turnRef.current = smoothDamp(springTurn.current, targetTurn, 0.22, dt);
  });

  return (
    <group position={[position[0], position[1], 0]}>
      <CapBracket brimDrop={brimDrop} />

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

export function CapsDisplay({ onOpenProduct }) {
  const caps = PRODUCTS_BY_SECTION.caps;
  const birchTexture = useMemo(
    () => createBirchPegTexture(BACKBOARD_DIMS[0], BACKBOARD_DIMS[1]),
    []
  );

  return (
    <group>
      {/* Birch Pegboard Back Panel */}
      <mesh position={[0, BACKBOARD_Y, BACKBOARD_DIMS[2] / 2]} receiveShadow>
        <boxGeometry args={BACKBOARD_DIMS} />
        <meshStandardMaterial map={birchTexture} roughness={0.85} />
      </mesh>

      {/* 8 Caps (4x2 Grid) */}
      <React.Suspense fallback={null}>
        {caps.map((cap, idx) => {
          const frontMeta = cap.meta?.front || { size: [0.2, 0.2], anchor: [0.5, 0.3], rim: 0.95 };
          const brimDrop = ((frontMeta.rim || 0.95) - (frontMeta.anchor ? frontMeta.anchor[1] : 0.3)) * frontMeta.size[1];

          return (
            <CapItem
              key={cap.id}
              product={cap}
              position={[
                CAP_COLS[idx % 4],
                CAP_ROWS[Math.floor(idx / 4)],
                CAP_Z
              ]}
              brimDrop={brimDrop}
              onOpen={onOpenProduct}
            />
          );
        })}
      </React.Suspense>
    </group>
  );
}
