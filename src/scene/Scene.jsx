import React from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { PALETTE } from '../config';
import { Lights } from './Lights';
import { Room } from './Room';
import { SectionWrapper } from './SectionWrapper';
import { ClothingRack } from './ClothingRack';
import { ShoesDisplay } from './ShoesDisplay';
import { BagsDisplay } from './BagsDisplay';
import { CapsDisplay } from './CapsDisplay';
import { SectionSign, WallPoster, POSTERS_BY_SECTION } from './Decor';
import { SECTION_CONFIG } from '../data/products';
import { CameraController } from './CameraController';
import { ProductFocusController } from './ProductFocusController';

export function Scene({
  currentSection,
  activeProduct,
  activeViewIndex,
  onViewChange,
  onOpenProduct,
  onExitSection,
  controlRef
}) {
  return (
    <div className="scene">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.05, far: 30 }}
        gl={{
          antialias: true,
          toneMapping: THREE.NeutralToneMapping,
          powerPreference: 'high-performance'
        }}
      >
        <color attach="background" args={[PALETTE.wall]} />
        <Lights />
        <Room />

        {/* 4 In-Store Interactive Stations wrapped in Section Spotlight & Decor */}
        {Object.values(SECTION_CONFIG).map((section) => (
          <SectionWrapper key={section.id} section={section}>
            {section.id === 'clothing' && (
              <ClothingRack onOpenProduct={onOpenProduct} />
            )}
            {section.id === 'shoes' && (
              <ShoesDisplay onOpenProduct={onOpenProduct} />
            )}
            {section.id === 'bags' && (
              <BagsDisplay onOpenProduct={onOpenProduct} />
            )}
            {section.id === 'caps' && (
              <CapsDisplay onOpenProduct={onOpenProduct} />
            )}

            <React.Suspense fallback={null}>
              <SectionSign sectionId={section.id} />
            </React.Suspense>
            {POSTERS_BY_SECTION[section.id]?.map(([x, name]) => (
              <React.Suspense fallback={null} key={name}>
                <WallPoster x={x} name={name} />
              </React.Suspense>
            ))}
          </SectionWrapper>
        ))}

        {/* Camera Station Navigation & In-Room Exploration */}
        <CameraController
          currentSection={currentSection}
          onExit={onExitSection}
        />

        {/* Product Inspection & Safe Zone Framing */}
        <ProductFocusController
          activeProduct={activeProduct}
          activeViewIndex={activeViewIndex}
          onViewChange={onViewChange}
          controlRef={controlRef}
        />
      </Canvas>
    </div>
  );
}
