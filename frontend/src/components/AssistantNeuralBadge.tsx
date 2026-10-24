import { motion } from 'framer-motion'
import { Bot, Sparkles, Cpu, ShieldCheck } from 'lucide-react'

interface AssistantNeuralBadgeProps {
  isThinking?: boolean
}

export default function AssistantNeuralBadge({ isThinking = false }: AssistantNeuralBadgeProps) {
  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      {/* Outer Breathing Ambient Ring */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Animated Ripple 1 */}
        <motion.div
          animate={{
            scale: isThinking ? [1, 1.4, 1] : [1, 1.18, 1],
            opacity: isThinking ? [0.6, 0.1, 0.6] : [0.4, 0.1, 0.4],
          }}
          transition={{
            duration: isThinking ? 1.2 : 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full border border-[#A9B887]/60 bg-[#A9B887]/5"
        />

        {/* Animated Ripple 2 */}
        <motion.div
          animate={{
            scale: isThinking ? [1, 1.25, 1] : [1, 1.08, 1],
            opacity: isThinking ? [0.8, 0.3, 0.8] : [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: isThinking ? 1.5 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.3,
          }}
          className="absolute inset-2 rounded-full border border-dashed border-[#A9B887]/70"
        />

        {/* Rotating Tech Reticle */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: isThinking ? 6 : 24,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-1 rounded-full border border-t-[#2E3D28] border-r-transparent border-b-[#A9B887] border-l-transparent"
        >
          {/* Orbital Satellite Node */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#2E3D28] shadow-[0_0_8px_rgba(46,61,40,0.5)]" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#A9B887]" />
        </motion.div>

        {/* Center Forest Pine Core */}
        <motion.div
          animate={{
            scale: isThinking ? [1, 1.06, 1] : 1,
            boxShadow: isThinking
              ? [
                  '0 10px 25px -5px rgba(46,61,40,0.25)',
                  '0 15px 35px -5px rgba(169,184,135,0.4)',
                  '0 10px 25px -5px rgba(46,61,40,0.25)',
                ]
              : '0 8px 20px -4px rgba(46,61,40,0.18)',
          }}
          transition={{ duration: 1.6, repeat: isThinking ? Infinity : 0 }}
          className="relative z-10 w-16 h-16 rounded-2xl bg-[#2E3D28] text-[#E8E9DF] flex items-center justify-center shadow-lg border border-[#3E5236]"
        >
          {isThinking ? (
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Cpu size={28} className="text-[#A9B887]" />
            </motion.div>
          ) : (
            <Bot size={28} className="text-[#E8E9DF]" />
          )}

          {/* Sparkle badge indicator */}
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#A9B887] text-[#2E3D28] flex items-center justify-center border-2 border-[#FFFFFF] shadow-sm">
            <Sparkles size={10} />
          </div>
        </motion.div>
      </div>

      {/* Status Pill */}
      <motion.div
        animate={isThinking ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
        transition={{ duration: 1, repeat: isThinking ? Infinity : 0 }}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F5EF] border border-[#D4D7C7] text-[#2E3D28]"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isThinking ? 'bg-[#C28424] animate-ping' : 'bg-[#4A7C38]'
          }`}
        />
        <span className="font-mono text-[10px] font-semibold tracking-wider uppercase">
          {isThinking ? 'AI Engine Processing…' : 'Route Engine Ready'}
        </span>
      </motion.div>
    </div>
  )
}
