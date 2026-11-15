import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { getAngleQuadrant } from '../utils/spring';

const planeGeometry = new THREE.PlaneGeometry(1, 1);
const tempCamPos = new THREE.Vector3();

function createBillboardMaterial(overlay) {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    alphaTest: 0.02,
    toneMapped: false,
    depthTest: !overlay
  });
}

function processPhotoTexture(photo, texture) {
  if (!photo.mirror) {
    return { map: texture, size: photo.size, anchor: photo.anchor };
  }
  const mirrored = texture.clone();
  mirrored.repeat.x = -1;
  mirrored.offset.x = 1;
  mirrored.needsUpdate = true;
  return {
    map: mirrored,
    size: photo.size,
    anchor: [1 - photo.anchor[0], photo.anchor[1]]
  };
}

export function ProductBillboard({
  photos,
  turnRef,
  fadeRef,
  drop = 0,
  overlay = false,
  first
}) {
  const rootRef = useRef();
  const innerRef = useRef();
  const meshARef = useRef();
  const meshBRef = useRef();

  const uniqueUrls = useMemo(() => [...new Set(photos.map((p) => p.url))], [photos]);
  const initialUrls = useMemo(
    () => (first === undefined ? uniqueUrls : [photos[first].url]),
    [first, photos, uniqueUrls]
  );
  const lazyUrls = useMemo(
    () => uniqueUrls.filter((u) => !initialUrls.includes(u)),
    [uniqueUrls, initialUrls]
  );

  const initialTextures = useLoader(THREE.TextureLoader, initialUrls);
  const [lazyTextures, setLazyTextures] = useState(null);

  useEffect(() => {
    if (lazyUrls.length === 0) return;
    const loader = new THREE.TextureLoader();
    let isCancelled = false;
    Promise.all(lazyUrls.map((url) => loader.loadAsync(url))).then((loaded) => {
      if (isCancelled) return;
      const map = {};
      lazyUrls.forEach((url, i) => {
        const tex = loaded[i];
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        map[url] = tex;
      });
      setLazyTextures(map);
    });
    return () => {
      isCancelled = true;
    };
  }, [lazyUrls]);

  const textureMap = useMemo(() => {
    const map = {};
    initialUrls.forEach((url, i) => {
      const tex = initialTextures[i];
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      map[url] = tex;
    });
    return { ...map, ...lazyTextures };
  }, [initialTextures, initialUrls, lazyTextures]);

  const processedPhotos = useMemo(() => {
    const fallback = first === undefined ? null : photos[first];
    return photos.map((p) => {
      const tex = textureMap[p.url] || (fallback ? textureMap[fallback.url] : null);
      if (tex) {
        return processPhotoTexture(p, tex);
      }
      return fallback && textureMap[fallback.url]
        ? processPhotoTexture(fallback, textureMap[fallback.url])
        : { map: null, size: p.size, anchor: p.anchor };
    });
  }, [photos, first, textureMap]);

  const materials = useMemo(
    () => [createBillboardMaterial(overlay), createBillboardMaterial(overlay)],
    [overlay]
  );

  useFrame(({ camera }) => {
    if (!rootRef.current || !innerRef.current) return;

    rootRef.current.worldToLocal(tempCamPos.copy(camera.position));
    const camAngle = Math.atan2(tempCamPos.x, tempCamPos.z);

    const curTurn = turnRef ? turnRef.current : 0;
    const { from, to, widthMix, swap, tilt } = getAngleQuadrant(curTurn - camAngle);

    let pFrom = processedPhotos[from % processedPhotos.length];
    let pTo = processedPhotos[to % processedPhotos.length];
    if (!pFrom?.map || !pTo?.map) {
      const fallbackPhoto = processedPhotos.find((p) => p && p.map);
      if (!fallbackPhoto) return;
      if (!pFrom?.map) pFrom = fallbackPhoto;
      if (!pTo?.map) pTo = fallbackPhoto;
    }

    const curWidth = pFrom.size[0] + (pTo.size[0] - pFrom.size[0]) * widthMix;
    const curAnchorX = pFrom.anchor[0] + (pTo.anchor[0] - pFrom.anchor[0]) * widthMix;
    const curFade = fadeRef ? fadeRef.current : 1;

    innerRef.current.rotation.y = camAngle + tilt;

    const layers = [
      [meshARef.current, materials[0], pFrom, 1 - swap],
      [meshBRef.current, materials[1], pTo, swap]
    ];

    for (const [mesh, mat, photo, weight] of layers) {
      if (!mesh) continue;
      const opacity = weight * curFade;
      const h = photo.size[1];
      mesh.visible = opacity > 0.001;
      mesh.scale.set(curWidth, h, 1);
      mesh.position.x = (0.5 - curAnchorX) * curWidth;
      mesh.position.y = (photo.anchor[1] - 0.5) * h;
      if (mat.map !== photo.map) {
        mat.map = photo.map;
        mat.needsUpdate = true;
      }
      mat.opacity = opacity;
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={innerRef} position={[0, -drop, 0]}>
        <mesh
          ref={meshARef}
          geometry={planeGeometry}
          material={materials[0]}
          castShadow={!overlay}
          renderOrder={overlay ? 11 : 0}
        />
        <mesh
          ref={meshBRef}
          geometry={planeGeometry}
          material={materials[1]}
          position-z={0.001}
          castShadow={!overlay}
          renderOrder={overlay ? 12 : 0}
        />
      </group>
    </group>
  );
}
