/**
 * DashboardOrb3D — Architectural 3D Globe with Orbital Navigation Rings
 * Styled in #E8E9DF (Light Sand), #A9B887 (Sage Olive), and #2E3D28 (Forest Pine)
 */
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

function ArchitecturalGlobe({ disruptions }: { disruptions: number }) {
  const globeRef = useRef<THREE.Mesh>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)
  const ring1Ref = useRef<THREE.Group>(null!)
  const ring2Ref = useRef<THREE.Group>(null!)
  const beaconRef = useRef<THREE.Mesh>(null!)

  const hasDisruptions = disruptions > 0
  const statusColor = hasDisruptions ? '#B83A3A' : '#2E3D28'
  const sageColor = '#A9B887'
  const sandColor = '#E8E9DF'

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (globeRef.current) {
      globeRef.current.rotation.y = t * 0.25
      globeRef.current.rotation.x = Math.sin(t * 0.1) * 0.1
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.15
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.35
      ring1Ref.current.rotation.y = t * 0.15
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = t * 0.25
      ring2Ref.current.rotation.z = -t * 0.2
    }
    if (beaconRef.current) {
      beaconRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.15)
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Outer Fine Wireframe Sage Cage */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[1.05, 32, 24]} />
        <meshStandardMaterial
          color={sageColor}
          roughness={0.3}
          metalness={0.7}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Inner Sculptural Sand/White Sphere */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.78, 48, 48]} />
        <meshPhysicalMaterial
          color={sandColor}
          roughness={0.2}
          metalness={0.1}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </mesh>

      {/* Central Status Core / Beacon */}
      <mesh ref={beaconRef}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={hasDisruptions ? 0.8 : 0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Orbital Trajectory Ring 1 (Forest Pine) */}
      <group ref={ring1Ref}>
        <mesh>
          <torusGeometry args={[1.35, 0.015, 16, 100]} />
          <meshStandardMaterial
            color="#2E3D28"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[1.35, 0, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={sageColor} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Orbital Trajectory Ring 2 (Sage Olive Arc) */}
      <group ref={ring2Ref} rotation={[Math.PI / 3, 0, Math.PI / 6]}>
        <mesh>
          <torusGeometry args={[1.5, 0.01, 16, 100]} />
          <meshStandardMaterial
            color={sageColor}
            metalness={0.85}
            roughness={0.2}
            transparent
            opacity={0.75}
          />
        </mesh>
        <mesh position={[-1.5, 0, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color={statusColor} />
        </mesh>
      </group>

      {/* Soft Studio Lighting */}
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} color="#FFFFFF" />
      <directionalLight position={[-3, -2, -2]} intensity={0.6} color="#E8E9DF" />
      <pointLight position={[0, 0, 0]} color={statusColor} intensity={hasDisruptions ? 1.0 : 0.3} distance={3} />
    </group>
  )
}

export default function DashboardOrb3D({ disruptions }: { disruptions: number }) {
  return (
    <div className="w-full flex flex-col items-center justify-center my-auto pt-1">
      <div style={{ height: '175px', width: '100%', position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0, 3.2], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
        >
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.25}>
            <ArchitecturalGlobe disruptions={disruptions} />
          </Float>
        </Canvas>
      </div>
      {/* Precision indicator */}
      <div className="text-center pt-1 pb-1">
        <div
          className="font-mono text-[10px] tracking-widest font-semibold flex items-center justify-center gap-1.5"
          style={{ color: disruptions > 0 ? '#B83A3A' : '#2E3D28' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{
              backgroundColor: disruptions > 0 ? '#B83A3A' : '#2E3D28',
              boxShadow: disruptions > 0 ? '0 0 6px rgba(184, 58, 58, 0.5)' : '0 0 6px rgba(46, 61, 40, 0.4)',
            }}
          />
          {disruptions > 0
            ? `${disruptions} ACTIVE DISRUPTION${disruptions > 1 ? 'S' : ''}`
            : 'ALL RECOVERY SYSTEMS NOMINAL'}
        </div>
      </div>
    </div>
  )
}
