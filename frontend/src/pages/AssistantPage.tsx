import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { chatWithAssistant } from '@/services/api'
import { apiErrorMessage } from '@/utils'
import { MessageSquare, Send, Bot, User, Zap, RefreshCcw, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage } from '@/types'
import AssistantNeuralBadge from '@/components/AssistantNeuralBadge'

const QUICK_PROMPTS = [
  { label: 'Explain recovery', text: 'Explain the recovery plan for my disrupted trip.' },
  { label: 'Budget options', text: 'What are the most affordable alternatives available?' },
  { label: 'Fastest route', text: 'What is the fastest way to reach my destination?' },
  { label: 'Change constraints', text: 'I want to increase my budget to ₹2000 and allow overnight travel.' },
  { label: 'Direct options', text: 'Show me options with no transfers.' },
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Bot size={14} className="text-[#2E3D28]" />
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full bg-[#A9B887]" />
        ))}
      </div>
      <span className="font-mono text-[10px] text-[#606E5A]">Processing recovery model…</span>
    </div>
  )
}

export default function AssistantPage() {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [history])

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const updated: ChatMessage[] = [...history, { role: 'user', content: msg }]
      setHistory(updated)
      setMessage('')
      return chatWithAssistant({ message: msg, history: updated })
    },
    onSuccess: (data) => setHistory(prev => [...prev, { role: 'assistant', content: data.response }]),
  })

  const submit = () => { const t = message.trim(); if (t && !chatMutation.isPending) chatMutation.mutate(t) }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="space-y-4 h-full flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-[#2E3D28]">
            <div className="w-8 h-8 rounded-lg bg-[#2E3D28] text-white flex items-center justify-center">
              <MessageSquare size={17} />
            </div>
            AI Assistant
          </h1>
          <p className="page-subtitle text-xs text-[#606E5A]">
            Natural language interface to the route recovery engine
          </p>
        </div>
        {history.length > 0 && (
          <button onClick={() => setHistory([])} className="btn btn-ghost btn-sm gap-1.5">
            <RefreshCcw size={13} />Clear
          </button>
        )}
      </div>

      <div className="flex-1 flex gap-5 min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 robo-card flex flex-col overflow-hidden bg-[#FFFFFF] border border-[#D4D7C7]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {/* Central Animated Neural Core */}
                <AssistantNeuralBadge isThinking={chatMutation.isPending} />

                <h3 className="font-display font-bold text-lg text-[#2E3D28] mt-3 mb-1">RouteRecover Intelligence</h3>
                <p className="font-mono text-xs max-w-md text-[#606E5A] mb-5">
                  Ask about your travel bookings, explore reroute alternatives,
                  or ask the engine to adjust budget & arrival deadlines.
                </p>

                {/* Quick Action Suggestion Chips in Center */}
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {QUICK_PROMPTS.slice(0, 3).map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => { setMessage(qp.text); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-[#F4F5EF] hover:bg-[#E8E9DF] border border-[#D4D7C7] text-[#2E3D28] font-mono transition-all hover:scale-[1.02]"
                    >
                      <Sparkles size={11} className="text-[#A9B887]" />
                      <span>{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {history.map((msg, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-[#F4F5EF] border border-[#D4D7C7] text-[#2E3D28] flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot size={14} />
                      </div>
                    )}
                    <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}
                         style={{ maxWidth: '80%' }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-[#2E3D28] text-white">
                        <User size={14} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {chatMutation.isPending && <TypingIndicator />}
            {chatMutation.isError && (
              <div className="alert-danger text-sm">
                {apiErrorMessage(chatMutation.error, 'Could not get a response from the assistant.')}
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-[#D4D7C7] bg-[#F4F5EF]/60">
            <div className="flex gap-2">
              <input
                id="assistant-input"
                type="text"
                className="input flex-1 bg-[#FFFFFF]"
                placeholder="Ask about travel recovery, budget, or fastest reroute…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
                disabled={chatMutation.isPending}
              />
              <button
                id="assistant-send-btn"
                onClick={submit}
                disabled={chatMutation.isPending || !message.trim()}
                className="btn btn-primary px-4"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Clean Quick Commands (No 3D canvas above) */}
        <div className="hidden lg:flex w-64 flex-col gap-3 flex-shrink-0">
          <div className="robo-card p-4 space-y-2.5 flex-1 bg-[#FFFFFF] border border-[#D4D7C7]">
            <div className="section-title mb-2"><span className="font-mono text-[9px] text-[#606E5A]">SYS://QUICK_COMMANDS</span></div>
            {QUICK_PROMPTS.map((qp, i) => (
              <motion.button key={i} whileHover={{ x: 3 }}
                onClick={() => { setMessage(qp.text); }}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all text-xs bg-[#F4F5EF] hover:bg-[#E8E9DF] border border-[#D4D7C7] text-[#2E3D28]">
                <div className="flex items-center gap-2">
                  <Zap size={11} className="text-[#A9B887] flex-shrink-0" />
                  <span className="font-mono text-[10px] font-medium">{qp.label}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
