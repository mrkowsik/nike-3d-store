import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ProductBillboard } from './ProductBillboard';
import { getItem, storeState } from '../utils/registry';
import { createSpring, smoothDamp } from '../utils/spring';
import { LAYOUT, PALETTE } from '../config';

const Rw = (a, b) => THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI;
const SAFE_DIST = 1.6;
const JUMP_DURATION = 0.12;
const JUMP_THRESHOLD = 1.75;
const SECTION_SCALES = {
  clothing: 0.85,
  shoes: 0.7,
  bags: 0.7,
  caps: 0.6
};

function getSafeBounds(width, height) {
  if (width < LAYOUT.phoneBreakpoint) {
    return {
      left: 0,
      right: width,
      top: LAYOUT.headerHeight,
      bottom: height * (1 - LAYOUT.sheetFraction) - LAYOUT.phoneThumbsHeight
    };
  }
  return {
    left: LAYOUT.thumbsWidth,
    right: width - LAYOUT.cardWidth - LAYOUT.cardMargin * 2,
    top: LAYOUT.headerHeight,
    bottom: height - LAYOUT.footerHeight
  };
}

function calculateTargetPlacement(product, camera, size, out) {
  const bounds = getSafeBounds(size.width, size.height);
  const halfFovRad = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hDist = SAFE_DIST * Math.tan(halfFovRad);
  const wDist = hDist * camera.aspect;

  const ndcX = ((bounds.left + bounds.right) / 2 / size.width) * 2 - 1;
  const ndcY = 1 - ((bounds.top + bounds.bottom) / 2 / size.height) * 2;
  const safeW = ((bounds.right - bounds.left) / size.width) * 2 * wDist;
  const safeH = ((bounds.bottom - bounds.top) / size.height) * 2 * hDist;

  const extW = Math.max(...product.photos.map((p) => p.size[0]));
  const extH = Math.max(...product.photos.map((p) => p.size[1]));
  const secScale = SECTION_SCALES[product.section] || 0.75;
  out.scale = secScale * Math.min(safeW / extW, safeH / extH);

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  out.center
    .copy(camera.position)
    .addScaledVector(forward, SAFE_DIST)
    .addScaledVector(right, ndcX * wDist)
    .addScaledVector(up, ndcY * hDist);

  out.right.copy(right);
  out.yaw = Math.atan2(camera.position.x - out.center.x, camera.position.z - out.center.z);
}

export function ProductFocusController({
  activeProduct,
  activeViewIndex,
  onViewChange,
  controlRef
}) {
  const { camera, size, gl } = useThree();
  const [focusEntries, setFocusEntries] = useState([]);
  const entriesMap = useRef(new Map());
  const activeKeyRef = useRef(null);

  const scrimMeshRef = useRef();
  const pointerDownInfo = useRef(null);

  useEffect(() => {
    storeState.productOpen = !!activeProduct;

    if (!activeProduct) {
      if (activeKeyRef.current) {
        const cur = entriesMap.current.get(activeKeyRef.current);
        if (cur) cur.mode = 'closing';
      }
      activeKeyRef.current = null;
      return;
    }

    const prev = activeKeyRef.current ? entriesMap.current.get(activeKeyRef.current) : null;
    const sameProduct = prev && prev.product.id === activeProduct.id;
    if (sameProduct) return;

    const sameSection = prev && prev.product.section === activeProduct.section;
    if (prev) {
      if (sameSection) {
        prev.mode = 'leaving';
        prev.exitDir = -1;
      } else {
        prev.mode = 'closing';
      }
    }

    const item = getItem(activeProduct.id);
    if (item?.fadeRef) {
      item.fadeRef.current = 0;
    }

    const newKey = `focus-${Date.now()}-${activeProduct.id}`;
    const initialTurn = sameSection ? 0.6 : (item ? Rw(0, item.turnRef?.current || 0) : 0);
    const newEntry = {
      key: newKey,
      product: activeProduct,
      item,
      mode: sameSection ? 'entering' : 'opening',
      progress: createSpring(sameSection ? 1 : 0),
      slide: createSpring(sameSection ? 0.55 : 0),
      opacity: createSpring(sameSection ? 0 : 1),
      turn: createSpring(initialTurn),
      turnTarget: (activeViewIndex % 4) * (Math.PI / 2),
      turnRef: { current: initialTurn },
      fadeRef: { current: 0 },
      jump: null,
      jumpFade: 1,
      show: createSpring(1),
      hidden: false,
      group: null,
      exitT: 0,
      exitDir: 1,
      lastView: -1
    };

    entriesMap.current.set(newKey, newEntry);
    activeKeyRef.current = newKey;
    setFocusEntries((prev) => [...prev, newEntry]);
  }, [activeProduct, activeViewIndex]);

  // Pointer drag to spin product
  useEffect(() => {
    const dom = gl.domElement;
    const handleDown = (e) => {
      if (!activeKeyRef.current || e.button !== 0) return;
      if (e.target.closest('.product-card, .view-thumbs, .step-arrow, .product-view__close')) return;
      pointerDownInfo.current = {
        id: e.pointerId,
        startX: e.clientX,
        lastX: e.clientX
      };
      storeState.grabbing = true;
    };

    const handleMove = (e) => {
      if (!pointerDownInfo.current || e.pointerId !== pointerDownInfo.current.id) return;
      const curEntry = activeKeyRef.current ? entriesMap.current.get(activeKeyRef.current) : null;
      if (!curEntry) return;

      const dx = e.clientX - pointerDownInfo.current.lastX;
      pointerDownInfo.current.lastX = e.clientX;

      curEntry.turn.value += dx * 0.01;
      curEntry.turnTarget = curEntry.turn.value;
      curEntry.turn.velocity = 0;
    };

    const handleUp = (e) => {
      if (pointerDownInfo.current && e.pointerId === pointerDownInfo.current.id) {
        pointerDownInfo.current = null;
        storeState.grabbing = false;
      }
    };

    dom.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      dom.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [gl]);

  // Expose controlRef for snapshot and showView
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      snapshot() {
        const cur = activeKeyRef.current ? entriesMap.current.get(activeKeyRef.current) : null;
        if (!cur || !cur.group) return null;

        const photo = cur.product.photos[activeViewIndex % cur.product.photos.length] || cur.product.photos[0];
        const [pw, ph] = photo.size;
        const corners = [
          new THREE.Vector3(-pw / 2, -ph / 2, 0),
          new THREE.Vector3(pw / 2, -ph / 2, 0),
          new THREE.Vector3(pw / 2, ph / 2, 0),
          new THREE.Vector3(-pw / 2, ph / 2, 0)
        ];

        const screenXs = [];
        const screenYs = [];

        corners.forEach((c) => {
          const world = cur.group.localToWorld(c.clone());
          world.project(camera);
          screenXs.push(((world.x + 1) / 2) * size.width);
          screenYs.push(((1 - world.y) / 2) * size.height);
        });

        cur.hidden = true;
        const minX = Math.min(...screenXs);
        const minY = Math.min(...screenYs);
        const maxX = Math.max(...screenXs);
        const maxY = Math.max(...screenYs);

        return {
          url: photo.url,
          mirror: photo.mirror,
          rect: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          }
        };
      },
      reveal() {
        const cur = activeKeyRef.current ? entriesMap.current.get(activeKeyRef.current) : null;
        if (cur) cur.hidden = false;
      },
      showView(idx) {
        const cur = activeKeyRef.current ? entriesMap.current.get(activeKeyRef.current) : null;
        if (!cur) return;
        const delta = Rw(cur.turn.value, idx * (Math.PI / 2));
        if (Math.abs(delta) > JUMP_THRESHOLD) {
          cur.jump = { to: cur.turn.value + delta, t: 0, done: false };
        } else {
          cur.turnTarget = cur.turn.value + delta;
        }
      }
    };
  }, [camera, size, activeViewIndex, controlRef]);

  const targetPlacement = useRef({
    center: new THREE.Vector3(),
    right: new THREE.Vector3(),
    scale: 1,
    yaw: 0
  });

  const shelfWorldPos = new THREE.Vector3();
  const safeTargetPos = new THREE.Vector3();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    let maxProgress = 0;
    const toRemove = [];

    entriesMap.current.forEach((entry) => {
      if (!entry.group) return;

      calculateTargetPlacement(entry.product, camera, size, targetPlacement.current);
      const place = targetPlacement.current;

      const p0 = entry.product.photos[0];
      const offsetX = (0.5 - (p0.anchor ? p0.anchor[0] : 0.5)) * p0.size[0];
      const offsetY = ((p0.anchor ? p0.anchor[1] : 0.5) - 0.5) * p0.size[1];
      const cosY = Math.cos(place.yaw);
      const sinY = Math.sin(place.yaw);

      safeTargetPos.set(
        place.center.x - offsetX * place.scale * cosY,
        place.center.y - offsetY * place.scale,
        place.center.z + offsetX * place.scale * sinY
      );

      if (entry.jump) {
        entry.jump.t += dt;
        if (!entry.jump.done && entry.jump.t >= JUMP_DURATION) {
          entry.turn.value = entry.jump.to;
          entry.turnTarget = entry.jump.to;
          entry.turn.velocity = 0;
          entry.jump.done = true;
        }
        entry.jumpFade = entry.jump.t < JUMP_DURATION
          ? 1 - entry.jump.t / JUMP_DURATION
          : Math.min(1, entry.jump.t / JUMP_DURATION - 1);
        if (entry.jump.t >= JUMP_DURATION * 2) {
          entry.jump = null;
        }
      } else {
        entry.jumpFade = 1;
      }

      entry.turnRef.current = smoothDamp(entry.turn, entry.turnTarget, 0.25, dt);

      let currentScale = place.scale;

      if (entry.mode === 'opening' || entry.mode === 'closing') {
        const targetP = entry.mode === 'closing' ? 0 : 1;
        const p = smoothDamp(entry.progress, targetP, 0.28, dt);

        if (entry.item?.object) {
          shelfWorldPos.set(0, -(entry.item.drop || 0), 0);
          entry.item.object.localToWorld(shelfWorldPos);
          entry.group.position.lerpVectors(shelfWorldPos, safeTargetPos, p);
          currentScale = THREE.MathUtils.lerp(1, place.scale, p);
        } else {
          entry.group.position.copy(safeTargetPos);
        }

        maxProgress = Math.max(maxProgress, p);
        if (entry.mode === 'closing' && p < 0.01) {
          toRemove.push(entry);
        }
      } else if (entry.mode === 'entering') {
        smoothDamp(entry.slide, 0, 0.15, dt);
        smoothDamp(entry.opacity, 1, 0.1, dt);
        entry.group.position.copy(safeTargetPos).addScaledVector(place.right, entry.slide.value);
        maxProgress = 1;
      } else if (entry.mode === 'leaving') {
        entry.exitT += dt;
        const t = Math.min(1, entry.exitT / 0.45);
        const smoothT = t * t * (3 - 2 * t);
        entry.slide.value = 0.55 * entry.exitDir * smoothT;
        entry.opacity.value = 1 - smoothT;
        entry.group.position.copy(safeTargetPos).addScaledVector(place.right, entry.slide.value);
        maxProgress = 1;
        if (t >= 1) {
          toRemove.push(entry);
        }
      }

      entry.group.scale.setScalar(currentScale);
      entry.group.rotation.set(0, place.yaw, 0);

      if (entry.hidden) {
        entry.show.value = 0;
      } else {
        smoothDamp(entry.show, 1, 0.15, dt);
      }

      entry.fadeRef.current = entry.opacity.value * entry.jumpFade * entry.show.value;

      if (entry.key === activeKeyRef.current) {
        const curQuad = THREE.MathUtils.euclideanModulo(Math.round(entry.turnTarget / (Math.PI / 2)), 4);
        if (curQuad !== entry.lastView) {
          entry.lastView = curQuad;
          onViewChange?.(curQuad);
        }
      }
    });

    if (toRemove.length > 0) {
      toRemove.forEach((r) => {
        entriesMap.current.delete(r.key);
        if (r.item) {
          r.item.fadeRef.current = 1;
        }
      });
      const removeKeys = new Set(toRemove.map((r) => r.key));
      setFocusEntries((prev) => prev.filter((e) => !removeKeys.has(e.key)));
    }

    // Scrim mesh opacity
    if (scrimMeshRef.current) {
      scrimMeshRef.current.visible = maxProgress > 0.001;
      if (scrimMeshRef.current.visible) {
        const fovRad = THREE.MathUtils.degToRad(camera.fov) / 2;
        const h = 2.2 * Math.tan(fovRad) * 1.2;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        scrimMeshRef.current.position.copy(camera.position).addScaledVector(forward, 2.2);
        scrimMeshRef.current.quaternion.copy(camera.quaternion);
        scrimMeshRef.current.scale.set(h * 2 * camera.aspect, h * 2, 1);
        scrimMeshRef.current.material.opacity = 0.93 * maxProgress;
      }
    }
  });

  return (
    <>
      {/* Background Dimming Scrim */}
      <mesh ref={scrimMeshRef} visible={false} renderOrder={10}>
        <planeGeometry />
        <meshBasicMaterial
          color={PALETTE.wall}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Floating Focused Product Billboards */}
      {focusEntries.map((entry) => (
        <group
          key={entry.key}
          ref={(el) => (entry.group = el)}
        >
          <React.Suspense fallback={null}>
            <ProductBillboard
              photos={entry.product.photos}
              turnRef={entry.turnRef}
              fadeRef={entry.fadeRef}
              overlay={true}
            />
          </React.Suspense>
        </group>
      ))}
    </>
  );
}
