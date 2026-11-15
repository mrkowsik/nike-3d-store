import React from 'react';
import { Environment, Lightformer } from '@react-three/drei';

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <Environment resolution={256}>
        {[-1.6, 0, 1.6].map((z) => (
          <Lightformer
            key={z}
            form="rect"
            intensity={3}
            position={[0, 3.2, z]}
            rotation-x={Math.PI / 2}
            scale={[6, 0.6, 1]}
          />
        ))}
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle) => (
          <Lightformer
            key={angle}
            form="rect"
            intensity={1.2}
            position={[Math.sin(angle) * 5, 1.8, Math.cos(angle) * 5]}
            rotation-y={angle + Math.PI}
            scale={[6, 2.5, 1]}
          />
        ))}
      </Environment>
    </>
  );
}
