/**
 * RobotScene3D — Procedural Sage Olive, Light Sand (#E8E9DF) & Forest Pine (#2E3D28) 3D Navigation Engine
 */
import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

/* ── User Palette Constants ── */
const LIGHT_SAND   = '#E8E9DF'
const SAGE_OLIVE   = '#A9B887'
const FOREST_PINE  = '#2E3D28'
const DEEP_FOREST  = '#1E291A'
const PEARL_WHITE  = '#F4F5EF'

function Hero3DNavigationVisual() {
  const outerCaliperRef = useRef<THREE.Group>(null!)
  const midCaliperRef   = useRef<THREE.Group>(null!)
  const innerGlobeRef   = useRef<THREE.Mesh>(null!)
  const wireGlobeRef    = useRef<THREE.Mesh>(null!)
  const routeCurve1     = useRef<THREE.Group>(null!)
  const routeCurve2     = useRef<THREE.Group>(null!)
  const waypointMarker1 = useRef<THREE.Mesh>(null!)
  const waypointMarker2 = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (innerGlobeRef.current) {
      innerGlobeRef.current.rotation.y = t * 0.15
    }
    if (wireGlobeRef.current) {
      wireGlobeRef.current.rotation.y = -t * 0.1
      wireGlobeRef.current.rotation.x = Math.sin(t * 0.08) * 0.12
    }
    if (outerCaliperRef.current) {
      outerCaliperRef.current.rotation.y = t * 0.18
      outerCaliperRef.current.rotation.x = Math.cos(t * 0.1) * 0.1
    }
    if (midCaliperRef.current) {
      midCaliperRef.current.rotation.z = -t * 0.22
      midCaliperRef.current.rotation.y = t * 0.12
    }
    if (routeCurve1.current) {
      routeCurve1.current.rotation.y = t * 0.35
    }
    if (routeCurve2.current) {
      routeCurve2.current.rotation.x = -t * 0.28
    }
    if (waypointMarker1.current) {
      const angle = t * 1.8
      waypointMarker1.current.position.x = Math.cos(angle) * 2.35
      waypointMarker1.current.position.y = Math.sin(angle) * 2.35
    }
    if (waypointMarker2.current) {
      const angle = -t * 1.4
      waypointMarker2.current.position.x = Math.cos(angle) * 1.8
      waypointMarker2.current.position.z = Math.sin(angle) * 1.8
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* ── Central Pearl Sand Navigational Core ── */}
      <mesh ref={innerGlobeRef}>
        <sphereGeometry args={[1.08, 48, 48]} />
        <meshPhysicalMaterial
          color={PEARL_WHITE}
          roughness={0.15}
          metalness={0.08}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </mesh>

      {/* ── Geodetic Coordinate Cage (Sage Olive Wireframe) ── */}
      <mesh ref={wireGlobeRef}>
        <sphereGeometry args={[1.22, 32, 22]} />
        <meshStandardMaterial
          color={SAGE_OLIVE}
          metalness={0.8}
          roughness={0.25}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* ── Outer Gyroscopic Precision Caliper (Forest Pine) ── */}
      <group ref={outerCaliperRef}>
        <mesh>
          <torusGeometry args={[2.05, 0.022, 16, 120]} />
          <meshStandardMaterial
            color={FOREST_PINE}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Precision Calibration Markers on Ring */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
          <mesh
            key={i}
            position={[Math.cos(ang) * 2.05, Math.sin(ang) * 2.05, 0]}
          >
            <cylinderGeometry args={[0.045, 0.045, 0.12, 16]} />
            <meshStandardMaterial color={SAGE_OLIVE} metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* ── Tilted Mid Caliper (Sage Olive) ── */}
      <group ref={midCaliperRef} rotation={[Math.PI / 3.8, Math.PI / 5, 0]}>
        <mesh>
          <torusGeometry args={[1.65, 0.016, 16, 100]} />
          <meshStandardMaterial
            color={SAGE_OLIVE}
            metalness={0.85}
            roughness={0.2}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[1.65, 0, 0]}>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color={FOREST_PINE} metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-1.65, 0, 0]}>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color={LIGHT_SAND} metalness={0.6} roughness={0.2} />
        </mesh>
      </group>

      {/* ── Primary Sage Olive Flight Route Curve ── */}
      <group ref={routeCurve1} rotation={[0.4, 0.6, 0]}>
        <mesh>
          <torusGeometry args={[2.35, 0.012, 12, 100, Math.PI * 1.4]} />
          <meshStandardMaterial
            color={SAGE_OLIVE}
            emissive={SAGE_OLIVE}
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <mesh ref={waypointMarker1}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color={FOREST_PINE}
            emissive={FOREST_PINE}
            emissiveIntensity={0.8}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* ── Secondary Deep Forest Curve ── */}
      <group ref={routeCurve2} rotation={[-0.5, -0.3, 0.4]}>
        <mesh>
          <torusGeometry args={[1.8, 0.01, 12, 90, Math.PI * 1.2]} />
          <meshStandardMaterial
            color={DEEP_FOREST}
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
        <mesh ref={waypointMarker2}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial
            color={SAGE_OLIVE}
            metalness={0.95}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* ── Warm Natural Studio Lighting ── */}
      <ambientLight intensity={1.3} color="#FFFDF9" />
      <directionalLight position={[6, 9, 8]} intensity={2.0} color="#FFFFFF" />
      <directionalLight position={[-6, -4, -3]} intensity={0.8} color="#E8E9DF" />
      <directionalLight position={[0, -6, 4]} intensity={0.5} color="#A9B887" />
      <pointLight position={[0, 0, 0]} color={SAGE_OLIVE} intensity={0.6} distance={5} />
    </group>
  )
}

export default function RobotScene3D({ height = '480px' }: { height?: string }) {
  return (
    <div
      style={{
        height,
        width: '100%',
        position: 'relative',
        touchAction: 'none',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-transparent">
            <div className="w-8 h-8 border-2 border-[#A9B887] border-t-[#2E3D28] rounded-full animate-spin" />
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0.2, 5.0], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.75]}
        >
          <Float speed={1.2} rotationIntensity={0.22} floatIntensity={0.25}>
            <Hero3DNavigationVisual />
          </Float>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.9}
            maxPolarAngle={Math.PI / 1.75}
            minPolarAngle={Math.PI / 2.35}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}
