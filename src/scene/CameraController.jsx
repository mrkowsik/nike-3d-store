import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SECTION_CONFIG } from '../data/products';
import { storeState } from '../utils/registry';

const FOV_STATION = 45;
const FOV_OVERVIEW = 58;
const ORBIT_RADIUS = 1.6;
const CAM_HEIGHT = 1.6;
const MAX_FIT_DIST = 6.2;
const CEILING_LIMIT = 3.2;
const FLOOR_LIMIT = 0.3;
const DRAG_SENSITIVITY = 0.004;
const TOUCH_MULTIPLIER = 1.25;
const FLICK_MAX_SPEED = 1400;
const FLICK_DECAY_TIME = 0.12;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function CameraController({ currentSection, onExit }) {
  const { camera, gl } = useThree();

  const stateRef = useRef({
    look: { yaw: 0, pitch: -0.04 },
    pan: { x: 0, y: 0 },
    zoom: 1,
    panLimit: 0.3,
    metresPerPixel: 0,
    fitDistance: 1.8,
    fingers: 0,
    flick: null
  });

  const targetRef = useRef({
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    fov: FOV_OVERVIEW
  });

  const smoothRef = useRef(null);
  const currentViewRef = useRef(currentSection);
  const exitCallbackRef = useRef(onExit);
  const pointerDownRef = useRef(null);

  useEffect(() => {
    exitCallbackRef.current = onExit;
  }, [onExit]);

  // Sync orientation on section change
  useEffect(() => {
    const s = stateRef.current;
    currentViewRef.current = currentSection;
    s.pan.x = 0;
    s.pan.y = 0;
    s.zoom = 1;
    s.flick = null;

    const sec = SECTION_CONFIG[currentSection];
    if (sec) {
      s.look = { yaw: sec.rotation, pitch: -0.04 };
    }
  }, [currentSection]);

  // Pan / Look Delta Function
  const applyDelta = (dx, dy) => {
    const s = stateRef.current;
    const view = currentViewRef.current;
    if (SECTION_CONFIG[view]) {
      s.pan.x = clamp(s.pan.x - dx * s.metresPerPixel, -s.panLimit, s.panLimit);
      s.pan.y = clamp(s.pan.y + dy * s.metresPerPixel * 0.5, -0.25, 0.25);
    } else {
      s.look.yaw += dx * DRAG_SENSITIVITY;
      s.look.pitch = clamp(s.look.pitch + dy * DRAG_SENSITIVITY, -0.45, 0.45);
    }
  };

  // Pointer & Gesture Event Listeners
  useEffect(() => {
    const dom = gl.domElement;
    const s = stateRef.current;

    const handlePointerDown = (e) => {
      if (storeState.productOpen || e.button !== 0) return;
      pointerDownRef.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }]
      };
      s.flick = null;
    };

    const handlePointerMove = (e) => {
      const p = pointerDownRef.current;
      if (!p || e.pointerId !== p.id || storeState.productOpen || storeState.grabbing) return;

      const dx = e.clientX - p.lastX;
      const dy = e.clientY - p.lastY;
      p.lastX = e.clientX;
      p.lastY = e.clientY;

      p.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      while (p.samples.length > 2 && e.timeStamp - p.samples[0].t > 90) {
        p.samples.shift();
      }

      applyDelta(dx, dy);
    };

    const handlePointerUp = (e) => {
      const p = pointerDownRef.current;
      if (!p || e.pointerId !== p.id) return;
      pointerDownRef.current = null;

      if (p.samples.length >= 2 && !storeState.productOpen && !storeState.grabbing) {
        const first = p.samples[0];
        const last = p.samples[p.samples.length - 1];
        const dt = last.t - first.t;
        if (dt > 0 && dt < 80) {
          const vx = ((last.x - first.x) / dt) * 1000;
          const vy = ((last.y - first.y) / dt) * 1000;
          const speed = Math.hypot(vx, vy);
          const factor = Math.min(1, FLICK_MAX_SPEED / speed);
          s.flick = { vx: vx * factor, vy: vy * factor };
        }
      }
    };

    const handleWheel = (e) => {
      if (storeState.productOpen) return;
      if (e.ctrlKey) {
        s.zoom = clamp(s.zoom * Math.exp(e.deltaY * 0.01), 0.5, 1);
      } else {
        applyDelta(-e.deltaX * 0.5, -e.deltaY * 0.5);
      }
    };

    const handleDblClick = () => {
      if (!storeState.productOpen && currentViewRef.current !== 'overview') {
        exitCallbackRef.current?.();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !storeState.productOpen && currentViewRef.current !== 'overview') {
        exitCallbackRef.current?.();
      }
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: true });
    dom.addEventListener('dblclick', handleDblClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gl]);

  // Main Camera Frame Loop
  useFrame(({ size }, delta) => {
    const s = stateRef.current;
    const c = targetRef.current;
    const dt = Math.min(delta, 0.05);
    const view = currentViewRef.current;

    // Direct centre jump if requested (e.g. tapping a product on the rail)
    const centre = storeState.centre;
    if (centre && centre.section === view) {
      s.pan.x = centre.along;
      s.pan.y = 0;
      storeState.centre = null;
    }

    // Apply flick inertia physics
    if (s.flick) {
      applyDelta(s.flick.vx * dt * TOUCH_MULTIPLIER, s.flick.vy * dt * TOUCH_MULTIPLIER);
      const decay = Math.exp(-dt / FLICK_DECAY_TIME);
      s.flick.vx *= decay;
      s.flick.vy *= decay;
      if (Math.hypot(s.flick.vx, s.flick.vy) < 10) {
        s.flick = null;
      }
    }

    const sec = SECTION_CONFIG[view];

    if (!sec) {
      // 3D OVERVIEW ("Store"):
      // Camera orbits along a circle of radius 1.6m at eye height (1.6m)
      const { yaw, pitch } = s.look;
      c.pos.set(Math.sin(yaw) * ORBIT_RADIUS, CAM_HEIGHT, Math.cos(yaw) * ORBIT_RADIUS);
      c.target
        .set(
          -Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          -Math.cos(yaw) * Math.cos(pitch)
        )
        .add(c.pos);
      c.fov = FOV_OVERVIEW * s.zoom;
      s.metresPerPixel = 0;
    } else {
      // 3D STATION VIEW (Clothing, Shoes, Bags, Caps):
      const fovH = THREE.MathUtils.degToRad(FOV_STATION);
      const fovW = 2 * Math.atan(Math.tan(fovH / 2) * camera.aspect);
      const [fitW, fitH] = sec.fit;

      s.fitDistance = Math.max(fitW / 2 / Math.tan(fovW / 2), fitH / 2 / Math.tan(fovH / 2));
      const dist = Math.min(s.fitDistance, MAX_FIT_DIST) * s.zoom;
      const visibleW = 2 * dist * Math.tan(fovW / 2);

      s.panLimit = Math.max(0.3, (fitW - visibleW) / 2 + 0.2);
      s.pan.x = clamp(s.pan.x, -s.panLimit, s.panLimit);
      s.metresPerPixel = visibleW / size.width;

      const rot = sec.rotation;
      const [originX, , originZ] = sec.origin;
      const sinR = Math.sin(rot);
      const cosR = Math.cos(rot);
      const { x: px, y: py } = s.pan;

      c.target.set(
        originX + cosR * px,
        sec.focusY + py,
        originZ - sinR * px
      );
      c.pos.set(
        originX + sinR * dist + cosR * px * 0.85,
        sec.focusY + py * 0.4,
        originZ + cosR * dist - sinR * px * 0.85
      );
      c.fov = FOV_STATION;
    }

    // Floor and Ceiling height clamp
    c.pos.y = clamp(c.pos.y, FLOOR_LIMIT, CEILING_LIMIT - FLOOR_LIMIT);

    // Direction vector from position to target
    c.dir.subVectors(c.target, c.pos);
    const targetYaw = Math.atan2(-c.dir.x, -c.dir.z);
    const targetPitch = Math.atan2(c.dir.y, Math.hypot(c.dir.x, c.dir.z));

    if (!smoothRef.current) {
      smoothRef.current = {
        pos: c.pos.clone(),
        yaw: targetYaw,
        pitch: targetPitch,
        fov: c.fov
      };
    }

    // Smooth game-dev damping (rate 7 during drag/flick, 3.5 during transition)
    const dampRate = (pointerDownRef.current || s.flick) ? 7 : 3.5;
    const damp = (cur, target) => THREE.MathUtils.damp(cur, target, dampRate, dt);

    const sm = smoothRef.current;
    sm.pos.set(
      damp(sm.pos.x, c.pos.x),
      damp(sm.pos.y, c.pos.y),
      damp(sm.pos.z, c.pos.z)
    );

    const diffYaw = THREE.MathUtils.euclideanModulo(targetYaw - sm.yaw + Math.PI, Math.PI * 2) - Math.PI;
    sm.yaw = damp(sm.yaw, sm.yaw + diffYaw);
    sm.pitch = damp(sm.pitch, targetPitch);
    sm.fov = damp(sm.fov, c.fov);

    camera.position.copy(sm.pos);
    camera.lookAt(
      sm.pos.x - Math.sin(sm.yaw) * Math.cos(sm.pitch),
      sm.pos.y + Math.sin(sm.pitch),
      sm.pos.z - Math.cos(sm.yaw) * Math.cos(sm.pitch)
    );

    if (Math.abs(camera.fov - sm.fov) > 0.01) {
      camera.fov = sm.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
