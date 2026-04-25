import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, useTexture } from "@react-three/drei";
import * as THREE from "three";

function ParticleField() {
  const pointsRef = useRef(null);
  const positions = useMemo(() => {
    const count = 420;
    const data = new Float32Array(count * 4);
    for (let i = 0; i < count; i += 1) {
      const radius = 1.2 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      data[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      data[i * 3 + 1] = radius * Math.cos(phi);
      data[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return data;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.08;
    pointsRef.current.rotation.x += delta * 0.03;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#7dd3fc" size={0.018} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

function CoreOrb() {
  const ringRef = useRef(null);
  const plateRef = useRef(null);
  const logoTexture = useTexture("/eduuu.jpg");

  useMemo(() => {
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    logoTexture.anisotropy = 8;
  }, [logoTexture]);

  useFrame(({ clock, mouse }) => {
    const t = clock.elapsedTime;

    if (ringRef.current) {
      ringRef.current.rotation.x = Math.sin(t * 0.5) * 0.12 + mouse.y * 0.28;
      ringRef.current.rotation.y += 0.006;
      ringRef.current.rotation.z = Math.cos(t * 0.36) * 0.08;
    }

    if (plateRef.current) {
      plateRef.current.rotation.y = mouse.x * 0.3;
      plateRef.current.rotation.x = -mouse.y * 0.2;
      plateRef.current.position.z = 0.78;
    }
  });

  return (
    <group>
      <mesh ref={ringRef}>
        <torusGeometry args={[1.16, 0.18, 64, 160]} />
        <meshPhysicalMaterial
          color="#f59e0b"
          metalness={1}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive="#d97706"
          emissiveIntensity={0.42}
        />
      </mesh>

      <mesh ref={plateRef}>
        <circleGeometry args={[0.72, 128]} />
        <meshPhysicalMaterial map={logoTexture} roughness={0.3} metalness={0.28} clearcoat={0.9} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.28, -0.6]}>
        <ringGeometry args={[0.54, 1.52, 96]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.42} />
      <spotLight position={[2.6, 3.2, 2.4]} intensity={2.8} color="#fde68a" angle={0.42} penumbra={0.55} />
      <pointLight position={[-2.2, 1.1, 2]} intensity={2.2} color="#38bdf8" />
      <pointLight position={[0, -2.8, 1.3]} intensity={1.3} color="#2563eb" />
      <directionalLight position={[0, 0, 3]} intensity={1.1} color="#f8fafc" />
    </>
  );
}

function Hero3DScene() {
  return (
    <div className="edv-webgl-canvas-wrap" aria-hidden="true">
      <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 1.8]} camera={{ position: [0, 0, 4.4], fov: 42 }}>
        <Suspense fallback={null}>
          <fog attach="fog" args={["#020617", 3.6, 7.8]} />
          <SceneLights />
          <CoreOrb />
          <ParticleField />
          <Sparkles count={48} speed={0.26} size={2.8} opacity={0.75} scale={[4, 4, 4]} color="#7dd3fc" />
          <Sparkles count={26} speed={0.2} size={3.6} opacity={0.5} scale={[2.3, 2.3, 2.3]} color="#fcd34d" />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Hero3DScene;
