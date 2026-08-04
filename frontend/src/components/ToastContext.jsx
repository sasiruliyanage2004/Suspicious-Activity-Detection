import React, { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000 }) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, type, title, message }])

    // Play sound based on type
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      if (type === 'error') {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      } else if (type === 'success') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
      }
    } catch (e) {
      // Audio might be blocked by browser policy until interaction
    }

    if (duration) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl animate-rise min-w-[320px] max-w-sm backdrop-blur-xl ${
              toast.type === 'error'
                ? 'bg-red-950/80 border-red-500/50 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                : toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-100 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' && <AlertTriangle size={20} className="text-red-400" />}
              {toast.type === 'success' && <CheckCircle size={20} className="text-emerald-400" />}
              {toast.type === 'info' && <Info size={20} className="text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-1">{toast.title}</h4>}
              <p className="font-mono text-xs opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
