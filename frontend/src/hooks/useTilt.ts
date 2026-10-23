/**
 * useTilt — Spatial 3D / 4D Pointer Tracking Hook
 * Provides smooth spring-damped multi-axis rotational inertia and spatial depth.
 * Matched with palette: #E8E9DF, #A9B887, #2E3D28
 */
import { useRef, useCallback } from 'react'

export function useTilt(intensity = 10, depth = 12) {
  const ref = useRef<HTMLDivElement>(null)
  const reqId = useRef<number | null>(null)

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)
    const dy = (e.clientY - cy) / (rect.height / 2)

    if (reqId.current) cancelAnimationFrame(reqId.current)
    reqId.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(900px) rotateX(${-dy * intensity}deg) rotateY(${dx * intensity}deg) translateZ(${depth}px) scale(1.025)`
      el.style.boxShadow = `
        ${-dx * 10}px ${-dy * 10}px 32px rgba(169, 184, 135, 0.25),
        0 20px 40px rgba(46, 61, 40, 0.12)
      `
    })
  }, [intensity, depth])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (reqId.current) cancelAnimationFrame(reqId.current)
    el.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)`
    el.style.boxShadow = ''
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}
