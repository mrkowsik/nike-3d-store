import React, { useRef, useEffect } from 'react';

export function SectionWrapper({ section, children }) {
  const spotRef = useRef();
  const targetRef = useRef();

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <group position={section.origin} rotation-y={section.rotation}>
      <spotLight
        ref={spotRef}
        position={[0, 3.05, 2.1]}
        angle={0.95}
        penumbra={1}
        intensity={13}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <object3D ref={targetRef} position={[0, section.focusY - 0.2, 0]} />
      {children}
    </group>
  );
}
