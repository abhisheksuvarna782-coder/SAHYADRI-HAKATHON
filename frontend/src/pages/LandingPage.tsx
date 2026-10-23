import React, { Suspense, lazy, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass, Zap, Shield, ArrowRight, AlertTriangle,
  BarChart2, Clock, CheckCircle2,
  SlidersHorizontal, MapPin, Activity, Route
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { runDemoScenario } from '@/services/api'
import { apiErrorMessage } from '@/utils'
import { useTilt } from '@/hooks/useTilt'

gsap.registerPlugin(ScrollTrigger)

// Lazy-load the signature 3D navigational sculpture
const RobotScene3D = lazy(() => import('@/components/RobotScene3D'))

/* ── 3D Tilt Feature Card ── */
function FeatureCard({
  icon: Icon,
  title,
  desc,
  tag,
  delay
}: {
  icon: React.ElementType
  title: string
  desc: string
  tag: string
  delay: number
}) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(6)
  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="feature-card robo-card robo-card-hover p-7 h-full flex flex-col justify-between"
      style={{
        transformStyle: 'preserve-3d',
        background: '#FFFFFF',
        border: '1px solid #D4D7C7',
      }}
    >
      <div>
        <div className="flex items-center justify-between mb-5" style={{ transform: 'translateZ(15px)' }}>
          <div className="w-11 h-11 rounded-xl bg-[#F4F5EF] border border-[#D4D7C7] flex items-center justify-center text-[#2E3D28] shadow-sm">
            <Icon size={20} />
          </div>
          <span className="font-mono text-[10px] tracking-wider text-[#606E5A] uppercase font-semibold">
            {tag}
          </span>
        </div>
        <h3
          className="font-display font-bold text-base mb-2.5 text-[#2E3D28]"
          style={{ transform: 'translateZ(10px)' }}
        >
          {title}
        </h3>
        <p
          className="text-sm text-[#606E5A] leading-relaxed"
          style={{ transform: 'translateZ(6px)' }}
        >
          {desc}
        </p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const heroContainerRef = useRef<HTMLDivElement>(null!)
  const heroVisualRef    = useRef<HTMLDivElement>(null!)
  const heroHeadlineRef  = useRef<HTMLHeadingElement>(null!)
  const pinnedSectionRef = useRef<HTMLDivElement>(null!)

  const demoMutation = useMutation({
    mutationFn: runDemoScenario,
    onSuccess: (data) => navigate(`/recovery/${data.recovery_plan_id}`),
  })

  // GSAP ScrollTrigger Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Hero Scroll Transformation
      if (heroVisualRef.current && heroContainerRef.current) {
        gsap.to(heroVisualRef.current, {
          scrollTrigger: {
            trigger: heroContainerRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
          y: 70,
          scale: 0.94,
          opacity: 0.85,
        })
      }

      // 2. Scroll-Triggered Reveal on Capabilities Cards
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 80%',
        },
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.7,
        ease: 'power2.out',
      })

      // 3. Pinned Storytelling Section - Stage Progress
      const stages = gsap.utils.toArray<HTMLElement>('.story-stage')
      if (stages.length && pinnedSectionRef.current) {
        stages.forEach((stage) => {
          gsap.to(stage, {
            scrollTrigger: {
              trigger: stage,
              start: 'top 65%',
              end: 'bottom 40%',
              toggleClass: { targets: stage, className: 'active-stage' },
            },
          })
        })
      }
    })

    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-[#E8E9DF] text-[#2E3D28] selection:bg-[#D8DFCA] selection:text-[#1E291A] overflow-x-hidden">

      {/* ── Background Architectural Grid ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(#A9B887 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            opacity: 0.5,
          }}
        />
        <div
          className="absolute top-0 right-0 w-[650px] h-[650px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(169, 184, 135, 0.25) 0%, rgba(232, 233, 223, 0) 70%)',
            filter: 'blur(75px)',
          }}
        />
      </div>

      {/* ── Top Navigation Bar ── */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between border-b border-[#D4D7C7] bg-[#E8E9DF]/90 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-[#2E3D28] text-white flex items-center justify-center shadow-sm">
            <Route size={18} />
          </div>
          <div>
            <span className="font-display font-bold text-base tracking-tight text-[#2E3D28]">RouteRecover</span>
            <span className="font-mono text-[10px] ml-1.5 font-semibold text-[#2E3D28] border border-[#A9B887] bg-[#A9B887]/20 px-1.5 py-0.5 rounded">
              AI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium text-[#606E5A] hover:text-[#2E3D28] transition-colors hidden sm:block"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/trips')}
            className="text-sm font-medium text-[#606E5A] hover:text-[#2E3D28] transition-colors hidden md:block"
          >
            My Trips
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary text-xs"
          >
            Launch System <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero Section (with Scroll-Linked Transformation) ── */}
      <section ref={heroContainerRef} className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-12 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Column: Refined Editorial Copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#D4D7C7] shadow-subtle">
              <span className="w-2 h-2 rounded-full bg-[#2E3D28]" />
              <span className="font-mono text-[11px] font-semibold text-[#2E3D28] uppercase tracking-wider">
                Autonomous Travel Recovery Platform
              </span>
            </div>

            <h1
              ref={heroHeadlineRef}
              className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#2E3D28] tracking-tight leading-[1.12]"
            >
              When journeys break, <br />
              <span className="text-[#606E5A] font-medium">precision recovery takes flight.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#606E5A] max-w-xl leading-relaxed">
              RouteRecover AI detects transport cancellations and delays in real-time,
              evaluates multimodal alternatives against your budget and arrival deadlines,
              and synthesizes optimal recovery itineraries in seconds.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary btn-lg shadow-elevation"
              >
                Enter Recovery Workspace <ArrowRight size={18} />
              </button>

              <button
                id="hero-demo-run-btn"
                onClick={() => demoMutation.mutate()}
                disabled={demoMutation.isPending}
                className="btn btn-outline btn-lg"
              >
                <Zap size={18} className="text-[#A9B887]" />
                {demoMutation.isPending ? 'Simulating Disruption…' : 'Run Live Demo Scenario'}
              </button>
            </div>

            {demoMutation.isError && (
              <p className="text-sm text-[#B83A3A] font-medium pt-1">
                {apiErrorMessage(demoMutation.error)}
              </p>
            )}

            {/* Metric telemetry bar */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#D4D7C7] max-w-lg">
              <div>
                <div className="font-display font-bold text-xl text-[#2E3D28]">&lt; 3.2s</div>
                <div className="font-mono text-[11px] text-[#606E5A]">Resolution Time</div>
              </div>
              <div>
                <div className="font-display font-bold text-xl text-[#2E3D28]">100%</div>
                <div className="font-mono text-[11px] text-[#606E5A]">Constraint Aware</div>
              </div>
              <div>
                <div className="font-display font-bold text-xl text-[#2E3D28]">Multimodal</div>
                <div className="font-mono text-[11px] text-[#606E5A]">Flight, Rail, Bus</div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Gyroscopic Nav Engine */}
          <div ref={heroVisualRef} className="lg:col-span-5 relative">
            <div className="relative rounded-2xl bg-gradient-to-b from-[#FFFFFF] to-[#F4F5EF] border border-[#D4D7C7] shadow-card p-3">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#D4D7C7]/70">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2E3D28] animate-pulse" />
                  <span className="font-mono text-[10px] tracking-wider text-[#2E3D28] font-semibold">
                    SYS://TRAJECTORY_ENGINE_3D
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#2E3D28] font-semibold bg-[#A9B887]/30 px-2 py-0.5 rounded">
                  INTERACTIVE
                </span>
              </div>

              {/* 3D Scene */}
              <Suspense
                fallback={
                  <div className="h-[460px] flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#D4D7C7] border-t-[#2E3D28] rounded-full animate-spin" />
                  </div>
                }
              >
                <RobotScene3D height="460px" />
              </Suspense>

              {/* Telemetry Badge */}
              <div className="absolute bottom-6 left-6 right-6 p-3 rounded-xl bg-[#FFFFFF]/95 backdrop-blur-md border border-[#D4D7C7] shadow-card flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#F4F5EF] border border-[#D4D7C7] flex items-center justify-center text-[#2E3D28]">
                    <Activity size={14} />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-bold text-[#2E3D28]">MANGALORE → BENGALURU</div>
                    <div className="text-[11px] text-[#606E5A]">Evaluating 5 transport alternatives</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-semibold text-[#2D6A35] bg-[#F1F8F2] px-2 py-0.5 rounded border border-[#CFE6D3]">
                  OPTIMAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pinned Storytelling Section (Workflow Sequence) ── */}
      <section ref={pinnedSectionRef} className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 border-t border-[#D4D7C7] bg-[#F4F5EF]">
        <div className="max-w-2xl mb-12">
          <span className="font-mono text-xs uppercase tracking-widest text-[#606E5A] font-semibold">
            Operational Lifecycle
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#2E3D28] mt-1.5 tracking-tight">
            How RouteRecover AI navigates travel disruptions
          </h2>
          <p className="text-sm text-[#606E5A] mt-2">
            A deterministic, constraint-verified recovery workflow designed to keep journeys unbroken.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="story-stage robo-card p-7 bg-[#FFFFFF] border border-[#D4D7C7] transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono text-xs font-bold text-[#606E5A] tracking-widest bg-[#E8E9DF] px-2.5 py-1 rounded">
                STAGE 01
              </span>
              <div className="w-9 h-9 rounded-full bg-[#FFF1F1] border border-[#F8CECE] text-[#B83A3A] flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="font-mono text-[11px] text-[#606E5A] uppercase tracking-wider">
              TELEMETRY INGESTION
            </div>
            <h3 className="font-display font-bold text-lg text-[#2E3D28] mt-0.5 mb-2">
              Disruption Detection
            </h3>
            <p className="text-sm text-[#606E5A] leading-relaxed">
              Flight cancelled or connecting train delayed. Real-time telemetry detects the failure and marks downstream bookings as disrupted.
            </p>
          </div>

          <div className="story-stage robo-card p-7 bg-[#FFFFFF] border border-[#D4D7C7] transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono text-xs font-bold text-[#606E5A] tracking-widest bg-[#E8E9DF] px-2.5 py-1 rounded">
                STAGE 02
              </span>
              <div className="w-9 h-9 rounded-full bg-[#E8E9DF] border border-[#A9B887] text-[#2E3D28] flex items-center justify-center">
                <SlidersHorizontal size={18} />
              </div>
            </div>
            <div className="font-mono text-[11px] text-[#606E5A] uppercase tracking-wider">
              FEASIBILITY ENGINE
            </div>
            <h3 className="font-display font-bold text-lg text-[#2E3D28] mt-0.5 mb-2">
              Constraint Assessment
            </h3>
            <p className="text-sm text-[#606E5A] leading-relaxed">
              Algorithms score candidate flights, express trains, and coaches against hard budget limits and required arrival deadlines.
            </p>
          </div>

          <div className="story-stage robo-card p-7 bg-[#FFFFFF] border border-[#D4D7C7] transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono text-xs font-bold text-[#606E5A] tracking-widest bg-[#E8E9DF] px-2.5 py-1 rounded">
                STAGE 03
              </span>
              <div className="w-9 h-9 rounded-full bg-[#F1F8F2] border border-[#CFE6D3] text-[#2D6A35] flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="font-mono text-[11px] text-[#606E5A] uppercase tracking-wider">
              ACTIONABLE RESOLUTION
            </div>
            <h3 className="font-display font-bold text-lg text-[#2E3D28] mt-0.5 mb-2">
              Synthesized Reroute
            </h3>
            <p className="text-sm text-[#606E5A] leading-relaxed">
              A comprehensive recovery plan is generated with complete cost breakdown, schedule adjustment, and one-click user authorization.
            </p>
          </div>
        </div>
      </section>

      {/* ── Feature Capabilities Grid ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 border-t border-[#D4D7C7]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-mono text-xs uppercase tracking-widest text-[#606E5A] font-semibold">
            Platform Capabilities
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#2E3D28] mt-1.5 tracking-tight">
            Engineered for travel resilience
          </h2>
          <p className="text-sm text-[#606E5A] mt-2.5">
            Everything needed to eliminate travel friction when unforeseen disruptions occur.
          </p>
        </div>

        <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={Compass}
            tag="Multimodal"
            title="Cross-Modal Alternatives"
            desc="Simultaneously evaluates flights, express trains, and intercity buses to formulate viable routes when one mode fails."
            delay={0.1}
          />
          <FeatureCard
            icon={BarChart2}
            tag="Financial"
            title="Transparent Cost Analysis"
            desc="Side-by-side comparison of original spend versus recovery plan, highlighting additional expenditure in ₹ INR."
            delay={0.15}
          />
          <FeatureCard
            icon={Clock}
            tag="Deadlines"
            title="Hard Time Deadlines"
            desc="Recovery solutions that violate meeting times, connecting flights, or hotel check-in cutoffs are automatically flagged."
            delay={0.2}
          />
          <FeatureCard
            icon={Shield}
            tag="Controlled"
            title="Deterministic Control"
            desc="Every plan requires explicit traveller approval. Transparent explanations provide full clarity before changes take effect."
            delay={0.25}
          />
        </div>
      </section>

      {/* ── Call to Action ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="p-10 lg:p-14 rounded-2xl bg-[#F4F5EF] border border-[#D4D7C7] shadow-card text-center relative overflow-hidden">
          <div className="max-w-xl mx-auto space-y-4">
            <span className="font-mono text-xs uppercase tracking-widest text-[#606E5A] font-semibold">
              Ready to Explore
            </span>
            <h2 className="font-display font-bold text-3xl text-[#2E3D28] tracking-tight">
              Test RouteRecover AI with our demo scenario
            </h2>
            <p className="text-sm text-[#606E5A] leading-relaxed">
              Experience the end-to-end recovery pipeline with the pre-seeded Mangalore to Bengaluru business trip scenario.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary btn-lg shadow-subtle"
              >
                Go to Dashboard <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[#D4D7C7] py-8 bg-[#E8E9DF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#2E3D28] text-white flex items-center justify-center text-xs">
              <Route size={13} />
            </div>
            <span className="font-display font-semibold text-sm text-[#2E3D28]">RouteRecover AI</span>
            <span className="text-xs text-[#606E5A]">· Intelligent Travel Recovery Platform</span>
          </div>
          <div className="font-mono text-[11px] text-[#606E5A]">
            Sahyadri DevHost 2026 / Synergia 26 Hackathon · Team QuadCoders
          </div>
        </div>
      </footer>
    </div>
  )
}
