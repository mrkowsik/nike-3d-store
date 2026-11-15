import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ProductBillboard } from './ProductBillboard';
import { smoothDamp, createSpring } from '../utils/spring';

const ANGLE_STEPS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

export function ProductInspector3D({
  product,
  activeViewIndex,
  onViewChange,
  inspectorRef
}) {
  const { camera, size, gl } = useThree();
  const groupRef = useRef();
  const turnAngleSpring = useRef(createSpring(0));
  const targetAngle = useRef(0);
  const isDragging = useRef(false);
  const prevX = useRef(0);

  // Position product slightly to the left on desktop to balance the right product card
  const isMobile = size.width < 700;
  const offsetX = isMobile ? 0 : -0.22;
  const offsetY = isMobile ? 0.15 : 0;

  useEffect(() => {
    targetAngle.current = ANGLE_STEPS[activeViewIndex % 4] || 0;
  }, [activeViewIndex]);

  useEffect(() => {
    const handlePointerDown = (e) => {
      // If clicking inside UI card or buttons, ignore
      if (e.target.closest('.product-card, .view-thumbs, .step-arrow, .product-view__close')) return;
      isDragging.current = true;
      prevX.current = e.clientX;
    };

    const handlePointerMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevX.current;
      prevX.current = e.clientX;
      targetAngle.current += dx * 0.012;

      // Update active angle thumbnail
      const norm = ((targetAngle.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const quad = Math.round(norm / (Math.PI / 2)) % 4;
      onViewChange?.(quad);
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onViewChange]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Smoothly damp angle
    const angle = smoothDamp(turnAngleSpring.current, targetAngle.current, 0.15, delta);

    // Keep inspector floating 1.4m in front of camera
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    const up = camera.up.clone().normalize();

    const inspectPos = camera.position
      .clone()
      .add(dir.multiplyScalar(1.35))
      .add(right.multiplyScalar(offsetX))
      .add(up.multiplyScalar(offsetY));

    groupRef.current.position.copy(inspectPos);
    groupRef.current.rotation.y = angle;
  });

  // Provide snapshot function for flying cart ghost
  useEffect(() => {
    if (!inspectorRef) return;
    inspectorRef.current = {
      getScreenRect() {
        if (!groupRef.current) return null;
        const pos = groupRef.current.position.clone();
        pos.project(camera);
        const x = ((pos.x + 1) / 2) * size.width;
        const y = ((-pos.y + 1) / 2) * size.height;
        return {
          x,
          y,
          url: product.photos[activeViewIndex % product.photos.length]?.url
        };
      }
    };
  }, [camera, size, product, activeViewIndex, inspectorRef]);

  return (
    <group ref={groupRef}>
      <React.Suspense fallback={null}>
        <ProductBillboard photos={product.photos} isInspecting={true} />
      </React.Suspense>
    </group>
  );
}
