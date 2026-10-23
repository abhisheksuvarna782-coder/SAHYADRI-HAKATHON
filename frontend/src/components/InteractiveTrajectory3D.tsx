/**
 * InteractiveTrajectory3D — Interactive 3D Journey Corridor Visualizer
 * Renders origin, destination, disruption point, and animated alternative reroutes in real 3D.
 * Allows user to rotate, inspect, and hover over trajectory segments.
 */
import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Text } from '@react-three/drei'
import * as THREE from 'three'

interface TrajectoryProps {
  origin?: string
  destination?: string
  costDelta?: number
  timeDelta?: string
}

function JourneyRouteVisual({ origin = 'Mangalore (IXE)', destination = 'Bengaluru (BLR)' }: TrajectoryProps) {
  const curveRef = useRef<THREE.Group>(null!)
  const pulseNodeRef = useRef<THREE.Mesh>(null!)
  const rerouteRef = useRef<THREE.Group>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (curveRef.current) {
      curveRef.current.rotation.y = Math.sin(t * 0.3) * 0.08
    }
    if (pulseNodeRef.current) {
      const s = 1 + Math.sin(t * 4) * 0.2
      pulseNodeRef.current.scale.set(s, s, s)
    }
    if (rerouteRef.current) {
      rerouteRef.current.position.y = Math.sin(t * 1.5) * 0.05
    }
  })

  // Origin Vector: [-2, 0, 0], Destination: [2, 0, 0]
  // Arcs constructed with QuadraticBezierCurves
  const originPos: [number, number, number] = [-1.8, 0, 0]
  const destPos: [number, number, number] = [1.8, 0, 0]
  const cancelledMid: [number, number, number] = [0, 0.9, 0]
  const recoveryMid: [number, number, number] = [0, -0.6, 0.4]

  const cancelledCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...originPos),
    new THREE.Vector3(...cancelledMid),
    new THREE.Vector3(...destPos)
  )
  const cancelledPoints = cancelledCurve.getPoints(50)
  const cancelledGeo = new THREE.BufferGeometry().setFromPoints(cancelledPoints)

  const recoveryCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...originPos),
    new THREE.Vector3(...recoveryMid),
    new THREE.Vector3(...destPos)
  )
  const recoveryPoints = recoveryCurve.getPoints(50)
  const recoveryGeo = new THREE.BufferGeometry().setFromPoints(recoveryPoints)

  return (
    <group position={[0, 0.1, 0]}>
      {/* ── Ground Architectural Grid ── */}
      <gridHelper args={[6, 12, '#A9B887', '#D4D7C7']} position={[0, -0.8, 0]} />

      {/* ── Origin Station Pillar ── */}
      <group position={originPos}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 0.8, 16]} />
          <meshStandardMaterial color="#2E3D28" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial color="#A9B887" emissive="#A9B887" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* ── Destination Station Pillar ── */}
      <group position={destPos}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 0.8, 16]} />
          <meshStandardMaterial color="#2E3D28" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial color="#2E3D28" emissive="#2E3D28" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* ── Original Cancelled Route (Dashed Crimson / Warning) ── */}
      <group ref={curveRef}>
        <mesh>
          <tubeGeometry args={[cancelledCurve, 32, 0.012, 6, false]} />
          <meshStandardMaterial color="#B83A3A" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Disruption Alert Pulse Marker at Midpoint */}
        <mesh ref={pulseNodeRef} position={cancelledMid}>
          <octahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial color="#B83A3A" emissive="#B83A3A" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* ── Active Recovery Reroute Arc (Thick Sage & Forest Pine Tube) ── */}
      <group ref={rerouteRef}>
        <mesh>
          <tubeGeometry args={[recoveryCurve, 40, 0.024, 8, false]} />
          <meshStandardMaterial
            color="#2E3D28"
            emissive="#A9B887"
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Moving Active Passenger Cabin Node */}
        <mesh position={[0.4, -0.5, 0.35]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#A9B887" emissive="#A9B887" emissiveIntensity={1.5} />
        </mesh>
      </group>

      {/* Studio Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 5, 4]} intensity={1.8} color="#FFFFFF" />
      <directionalLight position={[-4, -2, -2]} intensity={0.6} color="#E8E9DF" />
      <pointLight position={[0, 0, 0]} color="#A9B887" intensity={0.8} distance={4} />
    </group>
  )
}

export default function InteractiveTrajectory3D({ origin, destination }: TrajectoryProps) {
  return (
    <div className="w-full h-[220px] rounded-xl overflow-hidden bg-[#F4F5EF] border border-[#D4D7C7] relative">
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#2E3D28] animate-pulse" />
        <span className="font-mono text-[10px] font-bold text-[#2E3D28] tracking-wider uppercase">
          3D_RECOVERY_CORRIDOR
        </span>
      </div>
      <div className="absolute top-2.5 right-3 z-10 flex items-center gap-3 font-mono text-[9px] text-[#606E5A]">
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#B83A3A] inline-block" /> DISRUPTED</span>
        <span className="flex items-center gap-1"><span className="w-2 h-1 bg-[#2E3D28] rounded inline-block" /> RECOVERY PATH</span>
      </div>
      <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-xs font-mono text-[#606E5A]">Rendering 3D Corridor…</div>}>
        <Canvas camera={{ position: [0, 1.2, 3.4], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.2}>
            <JourneyRouteVisual origin={origin} destination={destination} />
          </Float>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 2.2}
            minPolarAngle={Math.PI / 3.5}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}
