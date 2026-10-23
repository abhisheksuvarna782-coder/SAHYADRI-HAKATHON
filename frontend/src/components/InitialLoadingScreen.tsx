/**
 * InitialLoadingScreen — Premium Sage Olive, Light Sand (#E8E9DF) & Forest Pine (#2E3D28) 3D Initial Brand Experience
 */
import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { Route } from 'lucide-react'

/* ── 3D Loading Navigational Sphere ── */
function LoadingGlobe3D() {
  const globeRef = useRef<THREE.Mesh>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)
  const ringRef  = useRef<THREE.Group>(null!)
  const markerRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (globeRef.current) {
      globeRef.current.rotation.y = t * 0.4
      globeRef.current.rotation.x = Math.sin(t * 0.2) * 0.15
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.25
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.6
      ringRef.current.rotation.y = t * 0.3
    }
    if (markerRef.current) {
      const angle = t * 1.5
      markerRef.current.position.x = Math.cos(angle) * 1.55
      markerRef.current.position.y = Math.sin(angle) * 1.55
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Outer Sage Olive Latitude Wireframe */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[1.2, 32, 24]} />
        <meshStandardMaterial
          color="#A9B887"
          wireframe
          transparent
          opacity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Inner Sand Sphere */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.85, 48, 48]} />
        <meshPhysicalMaterial
          color="#E8E9DF"
          roughness={0.15}
          metalness={0.1}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Orbiting Route Trajectory Ring */}
      <group ref={ringRef} rotation={[Math.PI / 3.5, 0, Math.PI / 4]}>
        <mesh>
          <torusGeometry args={[1.55, 0.018, 16, 100]} />
          <meshStandardMaterial
            color="#2E3D28"
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>
        {/* Active Traveling Waypoint Marker */}
        <mesh ref={markerRef}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial
            color="#A9B887"
            emissive="#A9B887"
            emissiveIntensity={1.2}
            metalness={0.8}
          />
        </mesh>
      </group>

      {/* Warm Natural Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} color="#FFFFFF" />
      <directionalLight position={[-4, -3, -2]} intensity={0.7} color="#E8E9DF" />
      <pointLight position={[0, 0, 0]} color="#A9B887" intensity={0.8} distance={4} />
    </group>
  )
}

export default function InitialLoadingScreen({ onFinished }: { onFinished: () => void }) {
  const [progress, setProgress] = useState(15)
  const [statusMessage, setStatusMessage] = useState('Initializing recovery telemetry…')
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(48)
      setStatusMessage('Syncing multimodal transport networks…')
    }, 450)

    const timer2 = setTimeout(() => {
      setProgress(82)
      setStatusMessage('Validating traveller constraint parameters…')
    }, 900)

    const timer3 = setTimeout(() => {
      setProgress(100)
      setStatusMessage('Workspace ready.')
    }, 1350)

    const timer4 = setTimeout(() => {
      setIsClosing(true)
      setTimeout(onFinished, 500)
    }, 1650)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [onFinished])

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          key="initial-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#E8E9DF]"
          style={{
            backgroundImage: 'radial-gradient(#A9B887 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        >
          {/* 3D Navigation Scene */}
          <div className="w-[300px] h-[300px] relative pointer-events-none">
            <Canvas
              camera={{ position: [0, 0, 3.8], fov: 42 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 1.5]}
            >
              <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.25}>
                <LoadingGlobe3D />
              </Float>
            </Canvas>
          </div>

          {/* Brand Typography & Progress */}
          <div className="text-center max-w-sm px-6 -mt-2 space-y-4">
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2E3D28] text-white flex items-center justify-center shadow-sm">
                <Route size={16} />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-[#2E3D28]">
                RouteRecover
              </span>
              <span className="font-mono text-[10px] font-semibold text-[#2E3D28] border border-[#A9B887] bg-[#A9B887]/20 px-1.5 py-0.5 rounded">
                AI
              </span>
            </div>

            <p className="font-display text-sm font-medium text-[#2E3D28]">
              Preparing your journey workspace
            </p>

            {/* Precision Progress Bar */}
            <div className="w-full bg-[#D4D7C7] h-1.5 rounded-full overflow-hidden border border-[#A9B887]/40">
              <motion.div
                className="h-full bg-gradient-to-r from-[#A9B887] to-[#2E3D28]"
                initial={{ width: '15%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            <p className="font-mono text-[11px] text-[#606E5A] tracking-wide h-4">
              {statusMessage}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
