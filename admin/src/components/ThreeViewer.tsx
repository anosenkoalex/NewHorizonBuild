// admin/src/components/ThreeViewer.tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const Cube: React.FC = () => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4f46e5" />
    </mesh>
  );
};

const ThreeViewer: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Cube />
        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
};

export default ThreeViewer;
