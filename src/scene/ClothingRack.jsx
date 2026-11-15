import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ProductBillboard } from './ProductBillboard';
import { NikeWordmark3D } from './Decor';
import { PRODUCTS_BY_SECTION } from '../data/products';
import { registerItem, storeState } from '../utils/registry';
import { createSpring, smoothDamp } from '../utils/spring';

const RAIL_RADIUS = 0.016;
const RAIL_LENGTH = 3.0;
const RAIL_OFFSET_Z = 0.3;
const HANGER_DROP = 0.05;
const MIN_GAP = 0.18;
const GAP_PAD = 0.04;
const PUSH_MARGIN = 0.12;

function ChromeMaterial() {
  return <meshStandardMaterial color="#e8e8e8" metalness={1} roughness={0.12} />;
}

// Wall Mount Flange and Support Arm
function WallMount({ x }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0, 0.006]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.012, 32]} />
        <ChromeMaterial />
      </mesh>
      <mesh position={[0, 0, RAIL_OFFSET_Z / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.011, 0.011, RAIL_OFFSET_Z, 16]} />
        <ChromeMaterial />
      </mesh>
      <mesh position={[0, 0, RAIL_OFFSET_Z]} castShadow>
        <sphereGeometry args={[0.024, 24, 16]} />
        <ChromeMaterial />
      </mesh>
    </group>
  );
}

// Rail Assembly
function RailStructure() {
  return (
    <group>
      {/* Horizontal Rail */}
      <mesh position={[0, 0, RAIL_OFFSET_Z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[RAIL_RADIUS, RAIL_RADIUS, RAIL_LENGTH, 32]} />
        <ChromeMaterial />
      </mesh>
      {/* End Cap Spheres */}
      {[-RAIL_LENGTH / 2, RAIL_LENGTH / 2].map((x) => (
        <mesh key={x} position={[x, 0, RAIL_OFFSET_Z]} castShadow>
          <sphereGeometry args={[RAIL_RADIUS * 1.25, 24, 16]} />
          <ChromeMaterial />
        </mesh>
      ))}
      <WallMount x={-1.38} />
      <WallMount x={1.38} />
    </group>
  );
}

// Wire Hanger Hook
function HangerHook({ drop }) {
  const geometry = useMemo(() => {
    const topY = RAIL_RADIUS + 0.0025 - 0.026;
    const curvePoints = [
      new THREE.Vector3(0, -drop, 0),
      new THREE.Vector3(0, (topY - 0.026 - drop) / 2, 0)
    ];
    for (let deg = -90; deg <= 215; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      curvePoints.push(
        new THREE.Vector3(0, topY + 0.026 * Math.sin(rad), 0.026 * Math.cos(rad))
      );
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    return new THREE.TubeGeometry(curve, 64, 0.0025, 8, false);
  }, [drop]);

  return (
    <mesh geometry={geometry} castShadow>
      <ChromeMaterial />
    </mesh>
  );
}

export function ClothingRack({ position = [0, 1.75, 0], onOpenProduct }) {
  const garments = PRODUCTS_BY_SECTION.clothing;
  const rackRef = useRef();
  const hoveredX = useRef(null);
  const activeHoverIdx = useRef(-1);

  // Compute resting positions
  const { garmentList, restPositions } = useMemo(() => {
    const list = garments.map((g, idx) => {
      const frontW = g.meta?.front?.size[0] || 0.5;
      const sideW = g.meta?.side?.size[0] || 0.2;
      return {
        ...g,
        frontWidth: frontW,
        sideWidth: sideW,
        phase: idx * 1.7,
        group: null,
        pivot: null,
        turn: createSpring(-1.35),
        turnRef: { current: -1.35 },
        fadeRef: { current: 1 },
        swing: createSpring(0)
      };
    });

    const widths = list.map((g) => Math.max(g.sideWidth, MIN_GAP) + GAP_PAD);
    let totalW = widths.reduce((acc, w) => acc + w, 0);
    let curr = -totalW / 2;
    const rest = widths.map((w) => {
      curr += w;
      return curr - w / 2;
    });

    list.forEach((g, i) => {
      g.x = createSpring(rest[i]);
    });

    return { garmentList: list, restPositions: rest };
  }, [garments]);

  // Find hovered garment
  const getHoverIndex = (hoverPos) => {
    if (hoverPos === null) return -1;
    let closestIdx = 0;
    let minDiff = Infinity;
    restPositions.forEach((pos, i) => {
      const diff = Math.abs(pos - hoverPos);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });
    return minDiff < 0.25 ? closestIdx : -1;
  };

  // Push apart garments when one is hovered
  const getSpreadPositions = (hoverIdx) => {
    if (hoverIdx < 0) return restPositions;
    const hg = garmentList[hoverIdx];
    const half = hg.frontWidth / 2 + PUSH_MARGIN;
    const leftPush = hoverIdx > 0 ? Math.max(0, half - (restPositions[hoverIdx] - restPositions[hoverIdx - 1])) : 0;
    const rightPush = hoverIdx < garmentList.length - 1 ? Math.max(0, half - (restPositions[hoverIdx + 1] - restPositions[hoverIdx])) : 0;

    return restPositions.map((p, idx) => {
      if (idx < hoverIdx) return p - leftPush;
      if (idx > hoverIdx) return p + rightPush;
      return p;
    });
  };

  const tempPos = new THREE.Vector3();

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const hoverIdx = getHoverIndex(hoveredX.current);
    if (hoverIdx !== activeHoverIdx.current) {
      document.body.style.cursor = hoverIdx >= 0 ? 'pointer' : '';
      activeHoverIdx.current = hoverIdx;
    }

    const targets = getSpreadPositions(hoverIdx);
    if (rackRef.current) {
      rackRef.current.worldToLocal(tempPos.copy(camera.position));
    }
    const time = clock.getElapsedTime();

    garmentList.forEach((g, idx) => {
      if (!g.group || !g.pivot) return;

      const curX = smoothDamp(g.x, targets[idx], 0.13, dt);
      g.group.position.x = curX;

      const angleToCam = Math.atan2(tempPos.x - curX, tempPos.z - RAIL_OFFSET_Z);
      const targetAngle = idx === hoverIdx ? angleToCam : -1.35;
      g.turnRef.current = smoothDamp(g.turn, targetAngle, 0.22, dt);

      // Swing based on rail slide velocity
      smoothDamp(g.swing, -g.x.velocity * 0.35, 0.25, dt);
      g.pivot.rotation.x = 0.012 * Math.sin(time * 2.6 + g.phase);
      g.pivot.rotation.z = g.swing.value;
    });
  });

  return (
    <group ref={rackRef} position={position}>
      {/* 3D NIKE Wordmark Sign Above Rail */}
      <NikeWordmark3D position={[0, 0.45, 0.002]} height={0.32} />

      {/* Chrome Rail with End Spheres & Wall Flanges */}
      <RailStructure />

      {/* Invisible Pointer Hit Plane along rail */}
      <mesh
        position={[0, 0.1 - 0.475, RAIL_OFFSET_Z + 0.2]}
        onPointerMove={(e) => {
          if (!storeState.touch && rackRef.current) {
            hoveredX.current = rackRef.current.worldToLocal(e.point.clone()).x;
          }
        }}
        onPointerOut={() => {
          if (!storeState.touch) hoveredX.current = null;
        }}
        onClick={(e) => {
          e.stopPropagation();
          let clickIdx = activeHoverIdx.current;
          if (clickIdx < 0 && rackRef.current) {
            const localX = rackRef.current.worldToLocal(e.point.clone()).x;
            clickIdx = getHoverIndex(localX);
          }
          if (clickIdx >= 0) {
            onOpenProduct(garmentList[clickIdx].id);
          }
        }}
      >
        <planeGeometry args={[3, 0.95]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 10 Hanging Garments */}
      <React.Suspense fallback={null}>
        {garmentList.map((g, idx) => (
          <group
            key={g.id}
            ref={(el) => (g.group = el)}
            position={[restPositions[idx], 0, RAIL_OFFSET_Z]}
            onClick={(e) => {
              e.stopPropagation();
              onOpenProduct(g.id);
            }}
          >
            <group
              ref={(pivotEl) => {
                g.pivot = pivotEl;
                if (pivotEl) {
                  registerItem(g.id, {
                    object: pivotEl,
                    turnRef: g.turnRef,
                    fadeRef: g.fadeRef,
                    drop: HANGER_DROP
                  });
                }
              }}
            >
              <HangerHook drop={HANGER_DROP} />
              <ProductBillboard
                photos={g.photos}
                turnRef={g.turnRef}
                fadeRef={g.fadeRef}
                drop={HANGER_DROP}
                first={1}
              />
            </group>
          </group>
        ))}
      </React.Suspense>
    </group>
  );
}
