import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ProductBillboard } from './ProductBillboard';
import { PRODUCTS_BY_SECTION } from '../data/products';
import { registerItem, storeState } from '../utils/registry';
import { createSpring, smoothDamp } from '../utils/spring';

const SHELF_WIDTH = 2.25;
const SHELF_DEPTH = 0.42;
const SHELF_THICK = 0.025;
const PLINTH_HEIGHT = 0.1;
const UNIT_HEIGHT = 1.075;

const PEG_X = [-0.84, -0.28, 0.28, 0.84];
const PEG_Y = 1.86;
const PEG_LEN = 0.07;

const SHELF_COLS = [-1, 0, 1].map((e) => e * 0.74167);
const SHELF_ROWS = [0.65, 0.125];

function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c8a272';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#8a6538';

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
  texture.anisotropy = 8;
  return texture;
}

function ShelfWood({ size, position }) {
  const tex = useMemo(() => createWoodTexture(), []);
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial map={tex} roughness={0.8} />
    </mesh>
  );
}

// Full Shelving Unit
function ShelfUnit() {
  const halfDepth = SHELF_DEPTH / 2;
  const unitCenterY = 0.6375;

  return (
    <group>
      {/* Matte Black Base Plinth */}
      <mesh position={[0, PLINTH_HEIGHT / 2, 0.19]} receiveShadow>
        <boxGeometry args={[2.21, PLINTH_HEIGHT, 0.38]} />
        <meshStandardMaterial color="#141414" roughness={0.6} />
      </mesh>

      {/* Back Panel */}
      <ShelfWood size={[SHELF_WIDTH, UNIT_HEIGHT, 0.012]} position={[0, unitCenterY, 0.006]} />

      {/* 3 Horizontal Shelves */}
      {[0, 1, 2].map((i) => (
        <ShelfWood
          key={`h${i}`}
          size={[SHELF_WIDTH, SHELF_THICK, SHELF_DEPTH]}
          position={[0, 0.1125 + i * 0.525, halfDepth]}
        />
      ))}

      {/* 4 Vertical Dividers */}
      {[-1.5, -0.5, 0.5, 1.5].map((v) => (
        <ShelfWood
          key={`v${v}`}
          size={[SHELF_THICK, UNIT_HEIGHT, SHELF_DEPTH]}
          position={[v * 0.74167, unitCenterY, halfDepth]}
        />
      ))}
    </group>
  );
}

// Chrome Wall Peg
function WallPeg({ x }) {
  return (
    <group position={[x, PEG_Y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.005]}>
        <cylinderGeometry args={[0.022, 0.022, 0.01, 24]} />
        <meshStandardMaterial color="#e8e8e8" metalness={1} roughness={0.12} />
      </mesh>
      <mesh rotation={[Math.PI / 2 - 0.25, 0, 0]} position={[0, 0.008, PEG_LEN / 2]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, PEG_LEN, 12]} />
        <meshStandardMaterial color="#e8e8e8" metalness={1} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.017, PEG_LEN]} castShadow>
        <sphereGeometry args={[0.009, 16, 12]} />
        <meshStandardMaterial color="#e8e8e8" metalness={1} roughness={0.12} />
      </mesh>
    </group>
  );
}

function BagItem({ product, position, hoverTurn = 0.3, onOpen }) {
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
      groupRef.current.position.y = 0.015 * liftVal;
      groupRef.current.position.z = position[2] + 0.03 * liftVal;
    }

    const targetTurn = isHovered ? hoverTurn : 0;
    turnRef.current = smoothDamp(springTurn.current, targetTurn, 0.22, dt);
  });

  return (
    <group position={[position[0], position[1], 0]}>
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

export function BagsDisplay({ onOpenProduct }) {
  const bags = PRODUCTS_BY_SECTION.bags;
  const crossbodies = bags.filter((b) => b.meta?.type === 'crossbody');
  const restBags = bags.filter((b) => b.meta?.type !== 'crossbody');

  return (
    <group>
      {/* Shelving Furniture Unit */}
      <ShelfUnit />

      {/* 4 Chrome Pegs */}
      {PEG_X.map((x) => (
        <WallPeg key={x} x={x} />
      ))}

      {/* 4 Hanging Crossbody Bags */}
      <React.Suspense fallback={null}>
        {crossbodies.map((bag, i) => (
          <BagItem
            key={bag.id}
            product={bag}
            position={[PEG_X[i], 1.872, PEG_LEN]}
            hoverTurn={0.3}
            onOpen={onOpenProduct}
          />
        ))}

        {/* 6 Backpacks, Duffels & Waistpack */}
        {restBags.map((bag, i) => (
          <BagItem
            key={bag.id}
            product={bag}
            position={[
              SHELF_COLS[i % 3],
              SHELF_ROWS[Math.floor(i / 3)],
              0.23
            ]}
            hoverTurn={0.3}
            onOpen={onOpenProduct}
          />
        ))}
      </React.Suspense>
    </group>
  );
}
