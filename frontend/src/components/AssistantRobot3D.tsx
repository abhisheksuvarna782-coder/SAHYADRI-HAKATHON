/**
 * AssistantRobot3D — Interactive 3D Holographic AI Core
 * Features:
 * - Counter-rotating multi-axis ring cage
 * - Neural energy pulsing crystalline core
 * - Dynamic reactive animation responding to typing / thinking status
 * - Color palette: #E8E9DF, #A9B887, #2E3D28
 */
import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

interface AssistantRobot3DProps {
  isThinking?: boolean
}

function AssistantCoreMesh({ isThinking }: AssistantRobot3DProps) {
  const outerRingRef = useRef<THREE.Group>(null!)
  const midRingRef   = useRef<THREE.Group>(null!)
  const innerRingRef = useRef<THREE.Group>(null!)
  const coreRef      = useRef<THREE.Mesh>(null!)
  const particlesRef = useRef<THREE.Points>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const speed = isThinking ? 2.5 : 1.0

    if (outerRingRef.current) {
      outerRingRef.current.rotation.y = t * 0.4 * speed
      outerRingRef.current.rotation.z = Math.sin(t * 0.2) * 0.15
    }
    if (midRingRef.current) {
      midRingRef.current.rotation.x = -t * 0.5 * speed
      midRingRef.current.rotation.z = t * 0.3 * speed
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.y = -t * 0.8 * speed
    }
    if (coreRef.current) {
      const pulse = isThinking
        ? 1.0 + Math.sin(t * 8) * 0.25
        : 1.0 + Math.sin(t * 2.5) * 0.08
      coreRef.current.scale.set(pulse, pulse, pulse)
      coreRef.current.rotation.y = t * 0.5
      coreRef.current.rotation.x = t * 0.3
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* ── Central Neural Crystal (Forest Pine & Sage) ── */}
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color="#2E3D28"
          emissive="#A9B887"
          emissiveIntensity={isThinking ? 1.4 : 0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* ── Inner Fast Gyroscopic Axis (Sage Olive) ── */}
      <group ref={innerRingRef}>
        <mesh>
          <torusGeometry args={[1.05, 0.018, 16, 60]} />
          <meshStandardMaterial color="#A9B887" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* ── Middle Tilted Gimbal Ring ── */}
      <group ref={midRingRef} rotation={[Math.PI / 4, Math.PI / 6, 0]}>
        <mesh>
          <torusGeometry args={[1.35, 0.015, 16, 80]} />
          <meshStandardMaterial
            color="#2E3D28"
            metalness={0.9}
            roughness={0.2}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[1.35, 0, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#A9B887" emissive="#A9B887" emissiveIntensity={1} />
        </mesh>
      </group>

      {/* ── Outer Precision Cage ── */}
      <group ref={outerRingRef}>
        <mesh>
          <torusGeometry args={[1.65, 0.014, 16, 100]} />
          <meshStandardMaterial
            color="#D4D7C7"
            metalness={0.8}
            roughness={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
          <mesh
            key={i}
            position={[Math.cos(ang) * 1.65, Math.sin(ang) * 1.65, 0]}
          >
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#2E3D28" />
          </mesh>
        ))}
      </group>

      {/* Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 5, 4]} intensity={1.8} color="#FFFFFF" />
      <pointLight position={[0, 0, 0]} color="#A9B887" intensity={isThinking ? 1.5 : 0.8} distance={4} />
    </group>
  )
}

export default function AssistantRobot3D({ isThinking = false }: AssistantRobot3DProps) {
  return (
    <div className="w-full h-[160px] rounded-xl overflow-hidden bg-[#F4F5EF] border border-[#D4D7C7] relative flex flex-col items-center justify-center">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isThinking ? 'bg-[#A9B887] animate-ping' : 'bg-[#2E3D28]'}`} />
        <span className="font-mono text-[9px] font-bold text-[#2E3D28] tracking-wider uppercase">
          AI_NEURAL_CORE_3D
        </span>
      </div>
      <div className="w-full h-full">
        <Suspense fallback={<div className="h-full flex items-center justify-center font-mono text-[10px] text-[#606E5A]">Booting 3D Core…</div>}>
          <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} gl={{ antialias: true, alpha: true }}>
            <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.25}>
              <AssistantCoreMesh isThinking={isThinking} />
            </Float>
          </Canvas>
        </Suspense>
      </div>
    </div>
  )
}
